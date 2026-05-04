package com.w16a.danish.common.messaging;

/**
 * Centralized RabbitMQ contract — exchange names, queue names, and routing keys
 * for cross-service async messaging.
 *
 * <p>Owning this in common-lib eliminates the per-service drift that occurred
 * when each microservice declared its own copies of the same magic strings.
 * Both publishers and listeners reference the same constants here, so a typo
 * fails at compile time rather than silently dropping a message.
 *
 * <p>Per-service Spring bean wiring (Queue/Exchange/Binding) still lives in
 * each service's own {@code *RabbitMQConfig.java} — only the contract values
 * (the strings actually exchanged on the wire) belong here.
 *
 * @author Eddy ZHANG
 */
public final class MessagingConstants {

    private MessagingConstants() { /* constants only */ }

    // ── Exchanges ─────────────────────────────────────────────────────────────

    /** Topic exchange used for all judge-related notifications. */
    public static final String JUDGE_EXCHANGE = "judge.exchange";

    /** Topic exchange used for award / winner notifications. */
    public static final String AWARD_EXCHANGE = "award.exchange";

    /** Topic exchange used for registration lifecycle events. */
    public static final String REGISTRATION_EXCHANGE = "registration.exchange";

    /** Topic exchange used for competition lifecycle events. */
    public static final String COMPETITION_EXCHANGE = "competition.exchange";

    // ── Queues ────────────────────────────────────────────────────────────────

    public static final String QUEUE_JUDGE_ASSIGNED        = "queue.judge.assigned";
    public static final String QUEUE_JUDGE_REMOVED         = "queue.judge.removed";
    public static final String QUEUE_AWARD_ANNOUNCEMENT    = "queue.award.announcement";
    public static final String QUEUE_REGISTRATION_CONFIRM  = "queue.registration.confirm";
    public static final String QUEUE_REGISTRATION_CANCEL   = "queue.registration.cancel";
    public static final String QUEUE_COMPETITION_CREATED   = "queue.competition.created";
    public static final String QUEUE_COMPETITION_UPDATED   = "queue.competition.updated";

    // ── Routing keys ──────────────────────────────────────────────────────────

    public static final String ROUTING_JUDGE_ASSIGNED        = "judge.assigned";
    public static final String ROUTING_JUDGE_REMOVED         = "judge.removed";
    public static final String ROUTING_AWARD_ANNOUNCEMENT    = "award.announcement";
    public static final String ROUTING_REGISTRATION_CONFIRM  = "registration.confirm";
    public static final String ROUTING_REGISTRATION_CANCEL   = "registration.cancel";
    public static final String ROUTING_COMPETITION_CREATED   = "competition.created";
    public static final String ROUTING_COMPETITION_UPDATED   = "competition.updated";
}
