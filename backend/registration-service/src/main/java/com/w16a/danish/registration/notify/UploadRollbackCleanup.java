package com.w16a.danish.registration.notify;

import com.w16a.danish.common.recovery.DurableTasks;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class UploadRollbackCleanup {
    private final DurableTasks tasks;
    private final PlatformTransactionManager transactions;

    public void watch(String objectName) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Upload compensation requires a transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) return;
                var transaction = new TransactionTemplate(transactions);
                transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                try {
                    transaction.executeWithoutResult(ignored -> tasks.enqueue("SUBMISSION_FILE_DELETE", null, null, Map.of("objectName", objectName)));
                } catch (Exception unavailable) {
                    // A database outage can also stop compensation; reference reconciliation is then required.
                    log.error("Upload rollback cleanup could not be persisted: {}", unavailable.getClass().getSimpleName());
                }
            }
        });
    }
}
