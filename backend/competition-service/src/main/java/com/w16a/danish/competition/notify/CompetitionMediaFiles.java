package com.w16a.danish.competition.notify;

import com.w16a.danish.common.recovery.DurableTasks;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import java.net.URI;
import java.util.Map;

/** Keeps the current asset until its database replacement commits. */
@Component
@RequiredArgsConstructor
@Slf4j
public class CompetitionMediaFiles {
    static final String DELETE = "COMPETITION_MEDIA_DELETE";
    private final DurableTasks tasks;
    private final PlatformTransactionManager transactions;

    public void deleteAfterCommit(String url) {
        String key = objectKey(url);
        if (key != null) tasks.enqueue(DELETE, null, null, Map.of("objectName", key));
    }

    public void watchUpload(String url) {
        String key = objectKey(url);
        if (key == null) throw new IllegalStateException("File service returned an invalid asset URL");
        if (!TransactionSynchronizationManager.isSynchronizationActive()) throw new IllegalStateException("Upload requires a transaction");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) return;
                var transaction = new TransactionTemplate(transactions);
                transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                try {
                    transaction.executeWithoutResult(ignored -> tasks.enqueue(DELETE, null, null, Map.of("objectName", key)));
                } catch (Exception unavailable) {
                    log.error("Media rollback cleanup could not be persisted: {}", unavailable.getClass().getSimpleName());
                }
            }
        });
    }

    private static String objectKey(String url) {
        if (url == null || url.isBlank()) return null;
        try {
            URI uri = URI.create(url);
            if (uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getRawUserInfo() != null
                    || (uri.getScheme() != null && !uri.getScheme().matches("https?"))) return null;
            String path = uri.getRawPath();
            String prefix = "/competition-assets/";
            if (path == null || !path.startsWith(prefix)) return null;
            String key = path.substring(prefix.length());
            return key.matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?") ? key : null;
        } catch (IllegalArgumentException invalid) { return null; }
    }
}
