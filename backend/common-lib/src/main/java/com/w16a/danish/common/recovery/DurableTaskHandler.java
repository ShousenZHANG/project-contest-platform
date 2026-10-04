package com.w16a.danish.common.recovery;

/** A real domain adapter, selected by one persisted task kind. Delivery may repeat. */
public interface DurableTaskHandler {
    String kind();
    void execute(DurableTask task) throws Exception;
}
