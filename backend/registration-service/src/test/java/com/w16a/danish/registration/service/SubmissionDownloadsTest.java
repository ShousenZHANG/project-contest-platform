package com.w16a.danish.registration.service;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import feign.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SubmissionDownloadsTest {
    private ISubmissionRecordsService submissions;
    private CompetitionGateway competitions;
    private CompetitionServiceClient competitionClient;
    private UserServiceClient users;
    private FileServiceClient files;
    private SubmissionDownloads downloads;
    private SubmissionRecords record;
    private CompetitionResponseVO competition;

    @BeforeEach
    void setUp() {
        submissions = mock(ISubmissionRecordsService.class);
        competitions = mock(CompetitionGateway.class);
        competitionClient = mock(CompetitionServiceClient.class);
        users = mock(UserServiceClient.class);
        files = mock(FileServiceClient.class);
        downloads = new SubmissionDownloads(submissions, competitions, competitionClient, users, files);
        record = new SubmissionRecords().setId("s1").setCompetitionId("c1").setUserId("owner")
                .setReviewStatus("APPROVED").setFileUrl("http://minio:9000/submissions/work-1.pdf");
        competition = new CompetitionResponseVO();
        competition.setIsPublic(true);
        when(submissions.getById("s1")).thenReturn(record);
        when(competitions.require("c1")).thenReturn(competition);
    }

    @Test
    void anonymousCanReadOnlyAnApprovedSubmissionInAPublicCompetition() {
        assertThat(downloads.requireAccessible("s1", null)).isSameAs(record);
        verifyNoInteractions(users, competitionClient, files);
    }

    @ParameterizedTest
    @CsvSource({"true,PENDING", "true,REJECTED", "false,APPROVED", "false,PENDING"})
    void publicRouteConcealsUnapprovedAndPrivateSubmissions(boolean publicCompetition, String status) {
        competition.setIsPublic(publicCompetition);
        record.setReviewStatus(status);
        assertStatus(() -> downloads.requireAccessible("s1", null), HttpStatus.NOT_FOUND);
        verifyNoInteractions(users, competitionClient, files);
    }

    @Test
    void missingPublicFlagFailsClosed() {
        competition.setIsPublic(null);
        assertStatus(() -> downloads.requireAccessible("s1", null), HttpStatus.NOT_FOUND);
    }

    @Test
    void missingSubmissionIs404BeforeCompetitionLookup() {
        when(submissions.getById("s1")).thenReturn(null);
        assertStatus(() -> downloads.requireAccessible("s1", null), HttpStatus.NOT_FOUND);
        verifyNoInteractions(competitions);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "REJECTED", "APPROVED"})
    void ownerAndAdministratorCanReadPrivateUnapprovedWork(String status) {
        competition.setIsPublic(false);
        record.setReviewStatus(status);
        assertThat(downloads.requireAccessible("s1", new RequestContext("owner", "PARTICIPANT"))).isSameAs(record);
        assertThat(downloads.requireAccessible("s1", new RequestContext("admin", "ADMIN"))).isSameAs(record);
        verifyNoInteractions(users, competitionClient);
    }

    @Test
    void teamMemberCanReadPrivatePendingTeamWork() {
        competition.setIsPublic(false);
        record.setUserId(null).setTeamId("team1").setReviewStatus("PENDING");
        when(users.isUserInTeam("member", "team1")).thenReturn(ResponseEntity.ok(true));
        assertThat(downloads.requireAccessible("s1", new RequestContext("member", "PARTICIPANT"))).isSameAs(record);
    }

    @ParameterizedTest
    @CsvSource({"false", "null"})
    void unverifiedTeamMemberCannotReadSubmission(String membership) {
        record.setTeamId("team1");
        when(users.isUserInTeam("outsider", "team1"))
                .thenReturn(ResponseEntity.ok("null".equals(membership) ? null : Boolean.FALSE));
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("outsider", "PARTICIPANT")),
                "null".equals(membership) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.FORBIDDEN);
    }

    @Test
    void participantCannotUseThePublicApprovalToBypassThePrivateRouteOwnerCheck() {
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("outsider", "PARTICIPANT")), HttpStatus.FORBIDDEN);
    }

    @Test
    void organizerMustBeAssignedToTheSubmissionCompetition() {
        competition.setIsPublic(false);
        record.setReviewStatus("PENDING");
        when(submissions.isUserOrganizerOfSubmission("s1", "assigned")).thenReturn(true);
        assertThat(downloads.requireAccessible("s1", new RequestContext("assigned", "ORGANIZER"))).isSameAs(record);
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("unassigned", "ORGANIZER")), HttpStatus.FORBIDDEN);
    }

    @Test
    void judgeMustBeAssignedAndTheWorkMustBeApproved() {
        competition.setIsPublic(false);
        when(competitionClient.isUserJudge("c1", "judge1")).thenReturn(ResponseEntity.ok(true));
        assertThat(downloads.requireAccessible("s1", new RequestContext("judge1", "JUDGE"))).isSameAs(record);
        when(competitionClient.isUserJudge("c1", "judge1")).thenReturn(ResponseEntity.ok(false));
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("judge1", "JUDGE")), HttpStatus.FORBIDDEN);
        when(competitionClient.isUserJudge("c1", "judge1")).thenReturn(ResponseEntity.ok(null));
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("judge1", "JUDGE")), HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "REJECTED"})
    void judgeCannotDownloadUnreviewedWorkEvenWhenAssigned(String status) {
        record.setReviewStatus(status);
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("judge1", "JUDGE")), HttpStatus.FORBIDDEN);
        verifyNoInteractions(competitionClient);
    }

    @Test
    void unknownRoleCannotDownloadEvenWhenItsUserIdMatchesTheOwner() {
        assertStatus(() -> downloads.requireAccessible("s1", new RequestContext("owner", "UNKNOWN")), HttpStatus.FORBIDDEN);
    }

    @Test
    void openingHistoricalRawUrlSendsOnlyThePrivateObjectNameToFileService() {
        Response stream = mock(Response.class);
        when(files.readSubmission("work-1.pdf")).thenReturn(stream);
        assertThat(downloads.open(record)).isSameAs(stream);
        verify(files).readSubmission("work-1.pdf");
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://minio:9000/submissions/key.zip", "https://storage.example/submissions/key.zip", "/submissions/key.zip"})
    void knownPrivateBucketReferencesProduceFlatKeys(String url) {
        assertThat(SubmissionDownloads.objectName(url)).isEqualTo("key.zip");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not a uri", "http://storage/avatars/key.zip", "http://storage/submissions/",
            "http://storage/submissions/folder/key.zip", "http://storage/submissions/..",
            "http://storage/submissions/../key.zip", "http://storage/submissions/%2e%2e%2fkey.zip",
            "http://storage/submissions/key%2fextra.zip", "http://user:password@storage/submissions/key.zip",
            "http://storage/submissions/key.zip?otherBucket=avatars", "http://storage/submissions/key.zip#fragment",
            "file:///submissions/key.zip", "http://storage/submissions/key\\extra.zip"})
    void malformedOrCrossBucketReferencesNeedRepairBeforeAnyFileRequest(String url) {
        record.setFileUrl(url);
        assertStatus(() -> downloads.open(record), HttpStatus.CONFLICT);
        verifyNoInteractions(files);
    }

    private static void assertStatus(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, HttpStatus status) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(status));
    }
}
