package com.w16a.danish.user.profile;

import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.user.domain.po.Users;
import com.w16a.danish.user.domain.vo.UserProfileVO;
import com.w16a.danish.user.feign.FileServiceClient;
import com.w16a.danish.user.mapper.UsersMapper;
import com.w16a.danish.user.service.IUsersService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.Map;
import java.util.Objects;

/** Owns avatar replacement, retaining the old object until the profile commits. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AvatarFiles {
    static final String DELETE = "USER_AVATAR_DELETE";
    private final ObjectProvider<IUsersService> users;
    private final UsersMapper mapper;
    private final FileServiceClient files;
    private final ObjectProvider<DurableTasks> tasks;
    private final PlatformTransactionManager transactions;

    @Transactional(rollbackFor = Exception.class)
    public UserProfileVO replace(String userId, MultipartFile file) {
        if (mapper.lockAccount(userId) == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }
        UserProfileVO profile = users.getObject().getUserProfile(userId);
        String previous = profile.getAvatarUrl();
        var response = files.uploadAvatar(file);
        if (response == null || !response.getStatusCode().is2xxSuccessful()
                || objectKey(response.getBody()) == null || Objects.equals(previous, response.getBody())) {
            throw new ServiceUnavailableException("file-service", "uploadAvatar");
        }
        String uploaded = response.getBody();
        watchUpload(uploaded);
        if (mapper.updateById(new Users().setId(userId).setAvatarUrl(uploaded)) != 1) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update user avatar");
        }
        deleteAfterCommit(previous);
        return users.getObject().getUserProfile(userId);
    }

    /** Called inside the owning database transaction; external avatar URLs are never deleted. */
    public void deleteAfterCommit(String url) {
        String key = objectKey(url);
        if (key != null) tasks.getObject().enqueue(DELETE, null, null, Map.of("objectName", key));
    }

    private void watchUpload(String url) {
        String key = objectKey(url);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Avatar upload requires a transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) return;
                var transaction = new TransactionTemplate(transactions);
                transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                try {
                    transaction.executeWithoutResult(ignored -> tasks.getObject().enqueue(DELETE, null, null, Map.of("objectName", key)));
                } catch (Exception unavailable) {
                    log.error("Avatar rollback cleanup could not be persisted: {}", unavailable.getClass().getSimpleName());
                }
            }
        });
    }

    static String objectKey(String url) {
        if (url == null || url.isBlank()) return null;
        try {
            URI uri = URI.create(url);
            if (uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getRawUserInfo() != null
                    || (uri.getScheme() != null && !uri.getScheme().matches("https?"))) return null;
            String path = uri.getRawPath();
            String prefix = "/user-avatar/";
            if (path == null || !path.startsWith(prefix)) return null;
            String key = path.substring(prefix.length());
            return key.matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?") ? key : null;
        } catch (IllegalArgumentException invalid) {
            return null;
        }
    }
}
