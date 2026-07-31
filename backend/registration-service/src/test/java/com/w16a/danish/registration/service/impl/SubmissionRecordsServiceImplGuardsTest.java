package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.dto.SubmissionReviewDTO;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The refusals on the submission paths.
 *
 * A Submission is the one artefact a participant cannot recreate, so the rules about who may
 * upload, replace, review and delete one are the rules that matter most here. They were also the
 * least-covered code in the service: every guard's failing branch was untested, which means a
 * guard could be deleted and the suite would stay green.
 *
 * Review and delete authorisation get the most attention, because those two decide whether one
 * participant can destroy another's work.
 */
class SubmissionRecordsServiceImplGuardsTest {

    private SubmissionRecordsServiceImpl service;
    private CompetitionGateway competitionGateway;
    private FileServiceClient fileServiceClient;
    private SubmissionNotifier notifier;
    private UserServiceClient userServiceClient;
    private ICompetitionParticipantsService participantsService;
    private ICompetitionOrganizersService organizersService;

    private LambdaQueryChainWrapper<SubmissionRecords> submissionQuery;
    private LambdaQueryChainWrapper<CompetitionParticipants> participantQuery;
    private LambdaQueryChainWrapper<CompetitionOrganizers> organizerQuery;

    private static final MultipartFile FILE =
            new MockMultipartFile("file", "entry.pdf", "application/pdf", "content".getBytes());

    private static RequestContext participant(String id) {
        return new RequestContext(id, "PARTICIPANT");
    }

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        competitionGateway = mock(CompetitionGateway.class);
        fileServiceClient = mock(FileServiceClient.class);
        notifier = mock(SubmissionNotifier.class);
        userServiceClient = mock(UserServiceClient.class);
        participantsService = mock(ICompetitionParticipantsService.class);
        organizersService = mock(ICompetitionOrganizersService.class);

        SubmissionRecordsServiceImpl real = new SubmissionRecordsServiceImpl(
                competitionGateway, fileServiceClient, notifier, userServiceClient);
        ReflectionTestUtils.setField(real, "competitionParticipantsService", participantsService);
        ReflectionTestUtils.setField(real, "competitionOrganizersService", organizersService);
        ReflectionTestUtils.setField(real, "baseMapper", mock(SubmissionRecordsMapper.class));
        service = spy(real);

        submissionQuery = mock(LambdaQueryChainWrapper.class);
        when(submissionQuery.eq(any(), any())).thenReturn(submissionQuery);
        when(submissionQuery.one()).thenReturn(null);
        doReturn(submissionQuery).when(service).lambdaQuery();

        participantQuery = mock(LambdaQueryChainWrapper.class);
        when(participantQuery.eq(any(), any())).thenReturn(participantQuery);
        when(participantsService.lambdaQuery()).thenReturn(participantQuery);

        organizerQuery = mock(LambdaQueryChainWrapper.class);
        when(organizerQuery.eq(any(), any())).thenReturn(organizerQuery);
        when(organizersService.lambdaQuery()).thenReturn(organizerQuery);
    }

    private static void assertRefused(org.assertj.core.api.ThrowableAssert.ThrowingCallable call,
                                      HttpStatus status, String messagePart) {
        assertThatThrownBy(call)
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(messagePart)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(status);
    }

    private CompetitionResponseVO competition(CompetitionStatus status, LocalDateTime endDate) {
        CompetitionResponseVO c = new CompetitionResponseVO();
        c.setName("Mock Competition");
        c.setStatus(status);
        c.setEndDate(endDate);
        return c;
    }

    @Nested
    @DisplayName("Submitting individual work")
    class SubmitWork {

        @Test
        @DisplayName("Submitting without registering first is 403")
        void unregisteredParticipantIsRefused() {
            when(participantQuery.exists()).thenReturn(false);

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.FORBIDDEN, "must register");
            verify(fileServiceClient, never()).uploadSubmission(any());
        }

        @Test
        @DisplayName("A competition past its end date refuses work even while still ONGOING")
        void pastTheDeadlineIsRefused() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, LocalDateTime.now().minusDays(1)));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.BAD_REQUEST, "already ended");
            verify(fileServiceClient, never()).uploadSubmission(any());
        }

        @Test
        @DisplayName("A completed competition refuses work")
        void closedCompetitionIsRefused() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.COMPLETED, null));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.BAD_REQUEST, "Cannot submit");
        }

        @Test
        @DisplayName("An unreachable competition-service is 503, not a rejected submission")
        void upstreamFailureIsServiceUnavailable() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1")).thenThrow(new IllegalStateException("timeout"));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.SERVICE_UNAVAILABLE, "Failed to verify competition");
        }

        @Test
        @DisplayName("A failed upload stops before anything is written to the database")
        void failedUploadStopsTheWrite() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, LocalDateTime.now().plusDays(1)));
            when(fileServiceClient.uploadSubmission(any())).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed");
            verify(service, never()).save(any(SubmissionRecords.class));
        }

        @Test
        @DisplayName("Re-submitting replaces the old file and resets the review to PENDING")
        void resubmittingResetsTheReview() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, LocalDateTime.now().plusDays(1)));
            when(fileServiceClient.uploadSubmission(any()))
                    .thenReturn(ResponseEntity.ok("http://minio/bucket/new.pdf"));

            SubmissionRecords existing = new SubmissionRecords();
            existing.setId("s1");
            existing.setFileUrl("http://minio/bucket/old.pdf");
            existing.setReviewStatus("APPROVED");
            existing.setReviewedBy("organizer-1");
            when(submissionQuery.one()).thenReturn(existing);
            doReturn(true).when(service).updateById(any(SubmissionRecords.class));

            UserBriefVO u = new UserBriefVO();
            u.setName("Tester");
            u.setEmail("t@example.com");
            when(userServiceClient.getUserBriefById("u1")).thenReturn(ResponseEntity.ok(u));

            service.submitWork(participant("u1"), "c1", "New title", "D", FILE);

            assertThat(existing.getReviewStatus()).isEqualTo("PENDING");
            assertThat(existing.getReviewedBy()).isNull();
            assertThat(existing.getTotalScore()).isNull();
            verify(fileServiceClient).deleteFile("bucket", "old.pdf");
        }

        @Test
        @DisplayName("A failed update is reported instead of silently keeping the old entry")
        void failedUpdateIsReported() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, null));
            when(fileServiceClient.uploadSubmission(any()))
                    .thenReturn(ResponseEntity.ok("http://minio/bucket/new.pdf"));
            when(submissionQuery.one()).thenReturn(new SubmissionRecords().setId("s1"));
            doReturn(false).when(service).updateById(any(SubmissionRecords.class));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update submission");
        }

        @Test
        @DisplayName("A failed insert is reported instead of pretending the work arrived")
        void failedSaveIsReported() {
            when(participantQuery.exists()).thenReturn(true);
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, null));
            when(fileServiceClient.uploadSubmission(any()))
                    .thenReturn(ResponseEntity.ok("http://minio/bucket/new.pdf"));
            doReturn(false).when(service).save(any(SubmissionRecords.class));

            assertRefused(() -> service.submitWork(participant("u1"), "c1", "T", "D", FILE),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save submission");
            verify(notifier, never()).sendSubmissionUploaded(any());
        }
    }

    @Nested
    @DisplayName("Submitting team work")
    class SubmitTeamWork {

        @Test
        @DisplayName("A non-member cannot submit on a team's behalf")
        void nonMemberIsRefused() {
            when(userServiceClient.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(false));

            assertRefused(() -> service.submitTeamWork(participant("u1"), "c1", "t1", "T", "D", FILE),
                    HttpStatus.FORBIDDEN, "not a member");
            verify(competitionGateway, never()).require(anyString());
        }

        @Test
        @DisplayName("An absent membership answer is treated as 'not a member', not as 'yes'")
        void missingMembershipAnswerIsRefused() {
            when(userServiceClient.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.submitTeamWork(participant("u1"), "c1", "t1", "T", "D", FILE),
                    HttpStatus.FORBIDDEN, "not a member");
        }

        @Test
        @DisplayName("Team work needs an ONGOING competition — UPCOMING is not enough")
        void upcomingCompetitionIsRefused() {
            when(userServiceClient.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(true));
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.UPCOMING, null));

            assertRefused(() -> service.submitTeamWork(participant("u1"), "c1", "t1", "T", "D", FILE),
                    HttpStatus.BAD_REQUEST, "not open for submissions");
        }

        @Test
        @DisplayName("A blank upload URL counts as a failure, not as a valid file")
        void blankUploadUrlIsAFailure() {
            when(userServiceClient.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(true));
            when(competitionGateway.require("c1"))
                    .thenReturn(competition(CompetitionStatus.ONGOING, LocalDateTime.now().plusDays(1)));
            when(fileServiceClient.uploadSubmission(any())).thenReturn(ResponseEntity.ok("   "));

            assertRefused(() -> service.submitTeamWork(participant("u1"), "c1", "t1", "T", "D", FILE),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file");
        }
    }

    @Nested
    @DisplayName("Reviewing a submission")
    class Review {

        private SubmissionReviewDTO review(String submissionId, String status) {
            SubmissionReviewDTO dto = new SubmissionReviewDTO();
            dto.setSubmissionId(submissionId);
            dto.setReviewStatus(status);
            dto.setReviewComments("Looks fine");
            return dto;
        }

        @Test
        @DisplayName("Reviewing a submission that does not exist is 404")
        void unknownSubmissionIsNotFound() {
            doReturn(null).when(service).getById("s1");

            assertRefused(() -> service.reviewSubmission(review("s1", "APPROVED"),
                            new RequestContext("o1", "ORGANIZER")),
                    HttpStatus.NOT_FOUND, "Submission not found");
        }

        @Test
        @DisplayName("An organizer of a different competition cannot review this one")
        void organizerOfAnotherCompetitionIsRefused() {
            doReturn(new SubmissionRecords().setId("s1").setCompetitionId("c1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(false);

            assertRefused(() -> service.reviewSubmission(review("s1", "APPROVED"),
                            new RequestContext("o1", "ORGANIZER")),
                    HttpStatus.FORBIDDEN, "not authorized to review");
        }

        @Test
        @DisplayName("Only APPROVED or REJECTED are accepted — PENDING is not a review outcome")
        void invalidReviewStatusIsRefused() {
            doReturn(new SubmissionRecords().setId("s1").setCompetitionId("c1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(true);

            assertRefused(() -> service.reviewSubmission(review("s1", "PENDING"),
                            new RequestContext("o1", "ORGANIZER")),
                    HttpStatus.BAD_REQUEST, "APPROVED or REJECTED");
        }

        @Test
        @DisplayName("A failed update leaves the caller with an error rather than a silent no-op")
        void failedUpdateIsReported() {
            doReturn(new SubmissionRecords().setId("s1").setCompetitionId("c1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(true);
            doReturn(false).when(service).updateById(any(SubmissionRecords.class));

            assertRefused(() -> service.reviewSubmission(review("s1", "approved"),
                            new RequestContext("o1", "ORGANIZER")),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update submission review");
        }

        @Test
        @DisplayName("A team submission notifies the team's creator, not the row's userId")
        void teamSubmissionNotifiesTheCreator() {
            doReturn(new SubmissionRecords().setId("s1").setCompetitionId("c1").setTeamId("t1").setUserId("u1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(true);
            doReturn(true).when(service).updateById(any(SubmissionRecords.class));
            when(competitionGateway.require("c1")).thenReturn(competition(CompetitionStatus.ONGOING, null));

            UserBriefVO reviewer = new UserBriefVO();
            reviewer.setId("o1");
            reviewer.setName("Organizer");
            when(userServiceClient.getUserBriefById("o1")).thenReturn(ResponseEntity.ok(reviewer));

            UserBriefVO creator = new UserBriefVO();
            creator.setId("creator-1");
            when(userServiceClient.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(creator));

            UserBriefVO submitter = new UserBriefVO();
            submitter.setName("Creator");
            submitter.setEmail("creator@example.com");
            when(userServiceClient.getUserBriefById("creator-1")).thenReturn(ResponseEntity.ok(submitter));

            service.reviewSubmission(review("s1", "APPROVED"), new RequestContext("o1", "ORGANIZER"));

            verify(userServiceClient).getTeamCreator("t1");
            verify(notifier).sendSubmissionReviewed(any());
        }

        @Test
        @DisplayName("A team submission whose creator has vanished is 404, not a blank email")
        void missingTeamCreatorIsNotFound() {
            doReturn(new SubmissionRecords().setId("s1").setCompetitionId("c1").setTeamId("t1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(true);
            doReturn(true).when(service).updateById(any(SubmissionRecords.class));
            when(competitionGateway.require("c1")).thenReturn(competition(CompetitionStatus.ONGOING, null));

            UserBriefVO reviewer = new UserBriefVO();
            reviewer.setId("o1");
            when(userServiceClient.getUserBriefById("o1")).thenReturn(ResponseEntity.ok(reviewer));
            when(userServiceClient.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.reviewSubmission(review("s1", "APPROVED"),
                            new RequestContext("o1", "ORGANIZER")),
                    HttpStatus.NOT_FOUND, "Team creator not found");
            verify(notifier, never()).sendSubmissionReviewed(any());
        }
    }

    @Nested
    @DisplayName("Deleting a submission")
    class Delete {

        @Test
        @DisplayName("Deleting something that is not there is 404")
        void unknownSubmissionIsNotFound() {
            doReturn(null).when(service).getById("s1");

            assertRefused(() -> service.deleteSubmission("s1", participant("u1")),
                    HttpStatus.NOT_FOUND, "Submission not found");
        }

        @Test
        @DisplayName("A participant cannot delete another participant's work")
        void anotherParticipantsWorkIsProtected() {
            doReturn(new SubmissionRecords().setId("s1").setUserId("someone-else").setCompetitionId("c1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(false);

            assertRefused(() -> service.deleteSubmission("s1", participant("u1")),
                    HttpStatus.FORBIDDEN, "not allowed to delete");
            verify(service, never()).removeById(anyString());
        }

        @Test
        @DisplayName("The competition's organizer may delete it, and the stored file goes too")
        void organizerMayDeleteAndTheFileFollows() {
            doReturn(new SubmissionRecords().setId("s1").setUserId("u2").setCompetitionId("c1")
                    .setFileUrl("http://minio/bucket/entry.pdf"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(true);
            doReturn(true).when(service).removeById("s1");

            service.deleteSubmission("s1", new RequestContext("o1", "ORGANIZER"));

            verify(fileServiceClient).deleteFile("bucket", "entry.pdf");
            verify(service).removeById("s1");
        }

        @Test
        @DisplayName("A failed delete is reported rather than answered as success")
        void failedRemovalIsReported() {
            doReturn(new SubmissionRecords().setId("s1").setUserId("u1").setCompetitionId("c1"))
                    .when(service).getById("s1");
            when(organizerQuery.exists()).thenReturn(false);
            doReturn(false).when(service).removeById("s1");

            assertRefused(() -> service.deleteSubmission("s1", participant("u1")),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete submission");
        }
    }

    @Nested
    @DisplayName("Deleting a team submission")
    class DeleteTeam {

        @Test
        @DisplayName("An individual submission cannot be deleted through the team route")
        void individualSubmissionIsRefused() {
            doReturn(new SubmissionRecords().setId("s1").setUserId("u1"))
                    .when(service).getById("s1");

            assertRefused(() -> service.deleteTeamSubmission("s1", participant("u1")),
                    HttpStatus.FORBIDDEN, "not a team submission");
        }

        @Test
        @DisplayName("A non-member cannot delete a team's work")
        void nonMemberIsRefused() {
            doReturn(new SubmissionRecords().setId("s1").setTeamId("t1"))
                    .when(service).getById("s1");
            when(userServiceClient.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(false));

            assertRefused(() -> service.deleteTeamSubmission("s1", participant("u1")),
                    HttpStatus.FORBIDDEN, "not authorized to delete");
        }

        @Test
        @DisplayName("An admin bypasses the membership check entirely")
        void adminDeletesWithoutMembership() {
            doReturn(new SubmissionRecords().setId("s1").setTeamId("t1"))
                    .when(service).getById("s1");
            doReturn(true).when(service).removeById("s1");

            service.deleteTeamSubmission("s1", new RequestContext("admin-1", "ADMIN"));

            verify(userServiceClient, never()).isUserInTeam(anyString(), anyString());
            verify(service).removeById("s1");
        }
    }

    @Nested
    @DisplayName("Batch lookups asked for nothing")
    class EmptyInput {

        @Test
        @DisplayName("An empty id list short-circuits instead of querying for everything")
        void emptyTeamStatusLookupReturnsEmpty() {
            Map<String, Boolean> byNullTeams = service.getSubmissionStatusByTeam(null, List.of("c1"));
            Map<String, Boolean> byNullCompetitions = service.getSubmissionStatusByTeam(List.of("t1"), List.of());

            assertThat(byNullTeams).isEmpty();
            assertThat(byNullCompetitions).isEmpty();
            // Never reached the database: no query chain was even built.
            verify(service, never()).lambdaQuery();
        }
    }
}
