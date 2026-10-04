package com.w16a.danish.registration.service;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.net.URI;

/** The Submission domain owns file access, including historical raw object URLs. */
@Service
@RequiredArgsConstructor
public class SubmissionDownloads {
    private final ISubmissionRecordsService submissions;
    private final CompetitionGateway competitions;
    private final CompetitionServiceClient competitionClient;
    private final UserServiceClient users;
    private final FileServiceClient files;

    public SubmissionRecords requireAccessible(String id, RequestContext user) {
        SubmissionRecords submission = submissions.getById(id);
        if (submission == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        var competition = competitions.require(submission.getCompetitionId());
        if (user == null) {
            if (!Boolean.TRUE.equals(competition.getIsPublic()) || !"APPROVED".equals(submission.getReviewStatus())) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
            }
            return submission;
        }
        boolean authorized = user.isAdmin();
        if ("PARTICIPANT".equalsIgnoreCase(user.role())) {
            authorized = user.userId().equals(submission.getUserId()) ||
                    (submission.getTeamId() != null && requireAccessReply(users.isUserInTeam(user.userId(), submission.getTeamId()), "user-service", "isUserInTeam"));
        } else if ("ORGANIZER".equalsIgnoreCase(user.role())) {
            authorized = submissions.isUserOrganizerOfSubmission(id, user.userId());
        } else if ("JUDGE".equalsIgnoreCase(user.role())) {
            authorized = "APPROVED".equals(submission.getReviewStatus()) &&
                    requireAccessReply(competitionClient.isUserJudge(submission.getCompetitionId(), user.userId()), "competition-service", "isUserJudge");
        }
        if (!authorized) throw new BusinessException(HttpStatus.FORBIDDEN, "You cannot download this submission");
        return submission;
    }

    public feign.Response open(SubmissionRecords submission) {
        return files.readSubmission(objectName(submission.getFileUrl()));
    }

    private static boolean requireAccessReply(org.springframework.http.ResponseEntity<Boolean> reply, String service, String operation) {
        if (reply == null || !reply.getStatusCode().is2xxSuccessful() || reply.getBody() == null) {
            throw new com.w16a.danish.common.exception.ServiceUnavailableException(service, operation);
        }
        return reply.getBody();
    }

    public static String objectName(String fileUrl) {
        try {
            URI uri = URI.create(fileUrl);
            String path = uri.getPath();
            if (path == null || !path.startsWith("/submissions/") || uri.getUserInfo() != null ||
                    uri.getRawQuery() != null || uri.getRawFragment() != null || !path.equals(uri.getRawPath()) ||
                    (uri.getScheme() != null && !"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) ||
                    !path.substring("/submissions/".length()).matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?")) {
                throw new IllegalArgumentException();
            }
            // No remote URL is fetched: only the known private bucket/key reaches file-service.
            return path.substring("/submissions/".length());
        } catch (RuntimeException malformed) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission file reference needs repair");
        }
    }
}
