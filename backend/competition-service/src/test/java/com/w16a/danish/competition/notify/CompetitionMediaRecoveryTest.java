package com.w16a.danish.competition.notify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.competition.domain.po.Competitions;
import com.w16a.danish.competition.feign.FileServiceClient;
import com.w16a.danish.competition.feign.UserServiceClient;
import com.w16a.danish.competition.mapper.CompetitionsMapper;
import com.w16a.danish.competition.service.ICompetitionJudgesService;
import com.w16a.danish.competition.service.ICompetitionOrganizersService;
import com.w16a.danish.competition.service.impl.CompetitionsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real local transactions exercise media failure guards together with persisted cleanup. */
class CompetitionMediaRecoveryTest {
    private static final String OLD_VIDEO = "https://files/competition-assets/old.mp4";
    private static final String NEW_VIDEO = "https://files/competition-assets/new.mp4";
    private static final String OLD_IMAGE = "https://files/competition-assets/old.png";
    private final FileServiceClient files = mock(FileServiceClient.class);
    private final CompetitionsMapper mapper = mock(CompetitionsMapper.class);
    private final ObjectMapper json = new ObjectMapper();
    private final MockMultipartFile video = new MockMultipartFile("file", "new.mp4", "video/mp4", new byte[]{1});
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private DurableTasks tasks;
    private CompetitionMediaFiles media;
    private CompetitionMediaCleanup cleanup;
    private CompetitionsServiceImpl competitions;

    @BeforeEach
    void database() {
        var datasource = new DriverManagerDataSource(
                "jdbc:h2:mem:competition_media_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(datasource);
        var manager = new DataSourceTransactionManager(datasource);
        transaction = new TransactionTemplate(manager);
        jdbc.execute("CREATE TABLE competitions (id VARCHAR(36) PRIMARY KEY, intro_video_url VARCHAR(1024), image_url VARCHAR(1024))");
        jdbc.update("INSERT INTO competitions VALUES ('c',?,?)", OLD_VIDEO, OLD_IMAGE);
        jdbc.execute("""
                CREATE TABLE durable_tasks (
                    id VARCHAR(36) PRIMARY KEY, owner VARCHAR(64) NOT NULL, kind VARCHAR(64) NOT NULL,
                    aggregate_id VARCHAR(128), aggregate_version BIGINT, payload CLOB NOT NULL,
                    state VARCHAR(16) NOT NULL, attempts INT NOT NULL, available_at TIMESTAMP NOT NULL,
                    lease_token VARCHAR(36), lease_until TIMESTAMP, last_error VARCHAR(255), created_at TIMESTAMP NOT NULL
                )
                """);
        cleanup = new CompetitionMediaCleanup(files);
        tasks = new DurableTasks(jdbc, json, Clock.systemUTC(), "competition-service", List.of(cleanup));
        media = new CompetitionMediaFiles(tasks, manager);
        competitions = spy(new CompetitionsServiceImpl(files, mock(ICompetitionOrganizersService.class),
                mock(UserServiceClient.class), mock(ICompetitionJudgesService.class), mock(CompetitionNotifier.class), media));
        ReflectionTestUtils.setField(competitions, "baseMapper", mapper);
        when(mapper.lockLifecycle("c")).thenAnswer(call -> {
            jdbc.queryForObject("SELECT id FROM competitions WHERE id='c' FOR UPDATE", String.class);
            return null;
        });
        doAnswer(call -> {
            var result = new Competitions().setId("c").setStatus(CompetitionStatus.UPCOMING).setIntroVideoUrl(currentVideo());
            String image = currentImage();
            result.setImageUrls(image == null ? List.of() : List.of(image));
            return result;
        }).when(competitions).getById("c");
        doAnswer(call -> {
            Competitions value = call.getArgument(0);
            String image = value.getImageUrls().isEmpty() ? null : value.getImageUrls().getFirst();
            return jdbc.update("UPDATE competitions SET intro_video_url=?,image_url=? WHERE id=?",
                    value.getIntroVideoUrl(), image, value.getId()) == 1;
        }).when(competitions).updateById(any(Competitions.class));
        when(files.uploadCompetitionPromo(video)).thenReturn(ResponseEntity.ok(NEW_VIDEO));
    }

    @Test
    void replacementCommitsItsNewReferenceAndOldCleanupWithoutPrematureDeletion() {
        var response = transaction.execute(status -> replaceVideo());
        assertThat(response).isNotNull();
        assertThat(response.getIntroVideoUrl()).isEqualTo(NEW_VIDEO);
        assertThat(currentVideo()).isEqualTo(NEW_VIDEO);
        assertThat(cleanupPayloads()).singleElement().asString().contains("old.mp4").doesNotContain("new.mp4");
        verify(files, never()).deleteFile(anyString(), anyString());
        var order = inOrder(mapper, competitions, files);
        order.verify(mapper).ensureLifecycleLock("c");
        order.verify(mapper).lockLifecycle("c");
        order.verify(competitions).getById("c");
        order.verify(files).uploadCompetitionPromo(video);
    }

    @Test
    void failedReferenceWriteRetainsOldVideoAndQueuesOnlyTheNewObjectForCleanup() {
        doReturn(false).when(competitions).updateById(any(Competitions.class));
        assertThatThrownBy(() -> transaction.execute(status -> replaceVideo()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Failed to save competition media");
        assertThat(currentVideo()).isEqualTo(OLD_VIDEO);
        assertThat(cleanupPayloads()).singleElement().asString().contains("new.mp4").doesNotContain("old.mp4");
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test
    void laterDomainFailureRollsBackBothReplacementAndOldDeletionCommand() {
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            replaceVideo();
            throw new IllegalStateException("later domain failure");
        })).hasMessageContaining("later domain failure");
        assertThat(currentVideo()).isEqualTo(OLD_VIDEO);
        assertThat(cleanupPayloads()).singleElement().asString().contains("new.mp4").doesNotContain("old.mp4");
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test
    void failedImageRemovalRetainsItsReferenceAndDiscardsDeletionCommand() {
        doReturn(false).when(competitions).updateById(any(Competitions.class));
        assertThatThrownBy(() -> transaction.execute(status ->
                competitions.deleteCompetitionImage("c", new RequestContext("admin", "ADMIN"), OLD_IMAGE)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Failed to save competition media");
        assertThat(currentImage()).isEqualTo(OLD_IMAGE);
        assertThat(cleanupPayloads()).isEmpty();
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test
    void successfulImageRemovalCommitsItsCleanupWithoutPrematureDeletion() {
        var response = transaction.execute(status ->
                competitions.deleteCompetitionImage("c", new RequestContext("admin", "ADMIN"), OLD_IMAGE));
        assertThat(response).isNotNull();
        assertThat(response.getImageUrls()).isEmpty();
        assertThat(currentImage()).isNull();
        assertThat(cleanupPayloads()).singleElement().asString().contains("old.png");
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @Test
    void committedCleanupRetriesAnOutageAndDoesNotRedeliverACompletedTask() {
        transaction.execute(status -> replaceVideo());
        when(files.deleteFile("competition-assets", "old.mp4"))
                .thenReturn(ResponseEntity.status(503).<String>build(), ResponseEntity.ok("deleted"));
        tasks.drain();
        assertThat(jdbc.queryForObject("SELECT state FROM durable_tasks", String.class)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT attempts FROM durable_tasks", Integer.class)).isEqualTo(1);
        assertThat(currentVideo()).isEqualTo(NEW_VIDEO);
        jdbc.update("UPDATE durable_tasks SET available_at=?", Timestamp.from(Instant.now().minusSeconds(1)));
        tasks.drain();
        tasks.drain();
        assertThat(jdbc.queryForObject("SELECT state FROM durable_tasks", String.class)).isEqualTo("DONE");
        assertThat(jdbc.queryForObject("SELECT attempts FROM durable_tasks", Integer.class)).isEqualTo(2);
        verify(files, times(2)).deleteFile("competition-assets", "old.mp4");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "not a URI with spaces", "https://external/old.mp4",
            "https://files/competition-assets/nested/old.mp4", "https://files/competition-assets/%2e%2e.mp4",
            "https://files/competition-assets/old.mp4?token=private", "https://files/competition-assets/old.mp4#fragment",
            "https://secret@files/competition-assets/old.mp4", "ftp://files/competition-assets/old.mp4"})
    void unmanagedReferencesNeverBecomeDeletionCommands(String url) {
        transaction.executeWithoutResult(status -> media.deleteAfterCommit(url));
        assertThat(cleanupPayloads()).isEmpty();
        verifyNoInteractions(files);
    }

    @Test
    void uploadCompensationRequiresAValidReferenceAndAnActiveTransaction() {
        assertThatThrownBy(() -> media.watchUpload("https://files/unknown/new.mp4"))
                .hasMessageContaining("invalid asset URL");
        assertThatThrownBy(() -> media.watchUpload(NEW_VIDEO)).hasMessageContaining("requires a transaction");
        assertThat(cleanupPayloads()).isEmpty();
    }

    @Test
    void cleanupRejectsPoisonedKeysAndRetainsFailuresForRetry() {
        var invalid = new DurableTask("invalid", cleanup.kind(), null, null,
                json.valueToTree(Map.of("objectName", "../user-avatar/a.png")));
        assertThatThrownBy(() -> cleanup.execute(invalid)).hasMessageContaining("Invalid asset key");
        verifyNoInteractions(files);
        var valid = new DurableTask("valid", cleanup.kind(), null, null, json.valueToTree(Map.of("objectName", "old.png")));
        assertThatThrownBy(() -> cleanup.execute(valid)).hasMessageContaining("Asset deletion failed");
        when(files.deleteFile("competition-assets", "old.png")).thenReturn(ResponseEntity.ok("already absent"));
        cleanup.execute(valid);
        cleanup.execute(valid);
        verify(files, times(3)).deleteFile("competition-assets", "old.png");
    }

    private com.w16a.danish.common.domain.vo.CompetitionResponseVO replaceVideo() {
        return competitions.uploadCompetitionMedia("c", new RequestContext("admin", "ADMIN"), "VIDEO", video);
    }

    private String currentVideo() {
        return jdbc.queryForObject("SELECT intro_video_url FROM competitions WHERE id='c'", String.class);
    }

    private String currentImage() {
        return jdbc.queryForObject("SELECT image_url FROM competitions WHERE id='c'", String.class);
    }

    private List<String> cleanupPayloads() {
        return jdbc.queryForList("SELECT payload FROM durable_tasks WHERE kind='COMPETITION_MEDIA_DELETE'", String.class);
    }
}
