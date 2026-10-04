package com.w16a.danish.common.messaging;

/** RabbitMQ names shared by notification publishers, broker declarations and listeners. */
public final class MessagingConstants {

    private MessagingConstants() {
    }

    public static final String COMPETITION_EXCHANGE_NAME = "competition.topic";
    public static final String REGISTRATION_EXCHANGE_NAME = "registration.topic";
    public static final String JUDGE_EXCHANGE_NAME = "judge.topic";

    public static final String JUDGE_ASSIGNED_QUEUE = "judge_assigned_queue";
    public static final String JUDGE_REMOVED_QUEUE = "judge_removed_queue";
    public static final String REGISTER_SUCCESS_QUEUE = "register_success_queue";
    public static final String PARTICIPANT_REMOVED_QUEUE = "participant_removed_queue";
    public static final String SUBMISSION_UPLOADED_QUEUE = "submission_uploaded_queue";
    public static final String SUBMISSION_REVIEWED_QUEUE = "submission_reviewed_queue";
    public static final String AWARD_WINNER_QUEUE = "award_winner_queue";

    public static final String JUDGE_ASSIGNED_ROUTING_KEY = "judge.assigned";
    public static final String JUDGE_REMOVED_ROUTING_KEY = "judge.removed";
    public static final String REGISTER_SUCCESS_ROUTING_KEY = "register.success";
    public static final String PARTICIPANT_REMOVED_ROUTING_KEY = "register.removed";
    public static final String SUBMISSION_UPLOADED_ROUTING_KEY = "submission.uploaded";
    public static final String SUBMISSION_REVIEWED_ROUTING_KEY = "submission.reviewed";
    public static final String AWARD_WINNER_ROUTING_KEY = "award.winner";
}
