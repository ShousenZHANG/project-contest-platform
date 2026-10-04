package com.w16a.danish.user.profile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.user.domain.po.Users;
import com.w16a.danish.user.domain.vo.UserProfileVO;
import com.w16a.danish.user.feign.FileServiceClient;
import com.w16a.danish.user.mapper.UsersMapper;
import com.w16a.danish.user.service.IUsersService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AvatarFilesTest {
    private final UsersMapper mapper = mock(UsersMapper.class);
    private final IUsersService users = mock(IUsersService.class);
    private final FileServiceClient files = mock(FileServiceClient.class);
    private final ObjectMapper json = new ObjectMapper();
    private final MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1});
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private AvatarFiles avatars;

    @BeforeEach void database() {
        var datasource = new DriverManagerDataSource("jdbc:h2:mem:avatars_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(datasource);
        var manager = new DataSourceTransactionManager(datasource);
        transaction = new TransactionTemplate(manager);
        jdbc.execute("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY,avatar_url VARCHAR(1024))");
        jdbc.update("INSERT INTO users VALUES ('u','https://files/user-avatar/old.png')");
        jdbc.execute("""
                CREATE TABLE durable_tasks (
                    id VARCHAR(36) PRIMARY KEY, owner VARCHAR(64) NOT NULL, kind VARCHAR(64) NOT NULL,
                    aggregate_id VARCHAR(128), aggregate_version BIGINT, payload CLOB NOT NULL,
                    state VARCHAR(16) NOT NULL, attempts INT NOT NULL, available_at TIMESTAMP NOT NULL,
                    lease_token VARCHAR(36), lease_until TIMESTAMP, last_error VARCHAR(255), created_at TIMESTAMP NOT NULL
                )
                """);
        var handler = new AvatarCleanup(files);
        var tasks = new DurableTasks(jdbc, json, Clock.systemUTC(), "user-service", List.of(handler));
        avatars = new AvatarFiles(provider(users), mapper, files, provider(tasks), manager);
        when(mapper.lockAccount("u")).thenAnswer(call -> jdbc.queryForObject("SELECT id FROM users WHERE id='u' FOR UPDATE", String.class));
        when(users.getUserProfile("u")).thenAnswer(call -> {
            var profile = new UserProfileVO(); profile.setAvatarUrl(currentAvatar()); return profile;
        });
        when(files.uploadAvatar(file)).thenReturn(ResponseEntity.ok("https://files/user-avatar/new.png"));
        when(mapper.updateById(any(Users.class))).thenAnswer(call -> {
            Users user = call.getArgument(0); return jdbc.update("UPDATE users SET avatar_url=? WHERE id=?", user.getAvatarUrl(), user.getId());
        });
    }

    @Test void replacementCommitsProfileAndOldObjectCleanupTogetherWithoutPrematureIo() {
        var profile = transaction.execute(status -> avatars.replace("u", file));
        assertThat(profile).isNotNull(); assertThat(profile.getAvatarUrl()).isEqualTo("https://files/user-avatar/new.png");
        assertThat(currentAvatar()).isEqualTo(profile.getAvatarUrl());
        assertThat(cleanupPayloads()).hasSize(1).allSatisfy(p -> assertThat(p).contains("old.png").doesNotContain("new.png"));
        verify(files, never()).deleteFile(anyString(), anyString());
        var order = inOrder(mapper, users, files);
        order.verify(mapper).lockAccount("u"); order.verify(users).getUserProfile("u"); order.verify(files).uploadAvatar(file);
    }

    @Test void profileWriteFailureRetainsOldAvatarAndPersistsOnlyNewObjectCompensation() {
        when(mapper.updateById(any(Users.class))).thenReturn(0);
        assertThatThrownBy(() -> transaction.execute(status -> avatars.replace("u", file))).hasMessageContaining("Failed to update user avatar");
        assertThat(currentAvatar()).isEqualTo("https://files/user-avatar/old.png");
        assertThat(cleanupPayloads()).hasSize(1).allSatisfy(p -> assertThat(p).contains("new.png").doesNotContain("old.png"));
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test void laterDomainRollbackDiscardsOldCleanupAndRestoresTheProfile() {
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            avatars.replace("u", file); throw new IllegalStateException("late failure");
        })).hasMessageContaining("late failure");
        assertThat(currentAvatar()).isEqualTo("https://files/user-avatar/old.png");
        assertThat(cleanupPayloads()).hasSize(1).allSatisfy(p -> assertThat(p).contains("new.png").doesNotContain("old.png"));
    }

    @Test void unmanagedOrEncodedObjectPathsNeverBecomeDeletionCommands() {
        for (String url : List.of("https://external/avatar.png", "https://files/user-avatar/nested/old.png",
                "https://files/user-avatar/%2e%2e/file.png", "https://files/user-avatar/old.png?token=private")) {
            transaction.executeWithoutResult(status -> avatars.deleteAfterCommit(url));
        }
        assertThat(cleanupPayloads()).isEmpty();
    }

    @Test void cleanupIsBucketScopedAndFailedDeliveriesCanRetry() {
        var handler = new AvatarCleanup(files);
        var task = new DurableTask("event", AvatarFiles.DELETE, null, null, json.valueToTree(Map.of("objectName", "old.png")));
        when(files.deleteFile("user-avatar", "old.png")).thenReturn(ResponseEntity.ok("deleted"));
        handler.execute(task); handler.execute(task);
        verify(files, times(2)).deleteFile("user-avatar", "old.png");
        when(files.deleteFile("user-avatar", "old.png")).thenReturn(ResponseEntity.status(503).build());
        assertThatThrownBy(() -> handler.execute(task)).hasMessageContaining("Avatar deletion failed");
    }

    private String currentAvatar() { return jdbc.queryForObject("SELECT avatar_url FROM users WHERE id='u'", String.class); }
    private List<String> cleanupPayloads() { return jdbc.queryForList("SELECT payload FROM durable_tasks WHERE kind='USER_AVATAR_DELETE'", String.class); }
    @SuppressWarnings("unchecked") private static <T> ObjectProvider<T> provider(T value) {
        ObjectProvider<T> provider = mock(ObjectProvider.class); when(provider.getObject()).thenReturn(value); return provider;
    }
}
