package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.JsonNode;

public record DurableTask(String id, String kind, String aggregateId, Long version, JsonNode payload) {}
