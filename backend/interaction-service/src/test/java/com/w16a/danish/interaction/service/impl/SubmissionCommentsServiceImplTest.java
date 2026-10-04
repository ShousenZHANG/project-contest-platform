package com.w16a.danish.interaction.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.interaction.domain.dto.SubmissionCommentDTO;
import com.w16a.danish.interaction.domain.po.SubmissionComments;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.interaction.domain.vo.SubmissionCommentVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import com.w16a.danish.interaction.feign.UserServiceClient;
import com.w16a.danish.interaction.mapper.SubmissionCommentsMapper;
import com.w16a.danish.common.domain.vo.UserBriefVO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import org.springframework.test.util.ReflectionTestUtils;

class SubmissionCommentsServiceImplTest {

    @Spy
    @InjectMocks
    private SubmissionCommentsServiceImpl submissionCommentsService;

    @Mock
    private RegistrationServiceClient registrationServiceClient;

    @Mock
    private UserServiceClient userServiceClient;

    @Mock
    private SubmissionCommentsMapper submissionCommentsMapper;

    @Mock
    private com.w16a.danish.interaction.service.PublicSubmissionAccess submissions;

    private static RequestContext ctx(String userId, String role) {
        return new RequestContext(userId, role);
    }

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(submissionCommentsService, "baseMapper", submissionCommentsMapper);

        LambdaQueryChainWrapper<SubmissionComments> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(submissionCommentsService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);

        when(submissionCommentsMapper.insert(any(SubmissionComments.class))).thenReturn(1);
        when(submissionCommentsMapper.updateById(any(SubmissionComments.class))).thenReturn(1);

        IPage<SubmissionComments> emptyPage = new Page<>();
        emptyPage.setRecords(Collections.emptyList());
        when(submissionCommentsMapper.selectPage(any(), any())).thenReturn(emptyPage);
    }

    @Test
    @DisplayName("✅ Add comment successfully")
    void testAddCommentSuccess() {
        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setSubmissionId("submissionId");
        dto.setContent("Nice work!");

        submissionCommentsService.addComment("userId", dto);

        verify(submissionCommentsMapper, times(1)).insert(any(SubmissionComments.class));
    }

    @Test
    void repliesCannotUseAParentFromAnotherSubmission() {
        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setSubmissionId("s1");
        dto.setParentId("parent");
        dto.setContent("Reply");
        doReturn(new SubmissionComments().setId("parent").setSubmissionId("other")).when(submissionCommentsService).getById("parent");
        assertThatThrownBy(() -> submissionCommentsService.addComment("user", dto))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Parent comment not found");
        verify(submissionCommentsMapper, never()).insert(any(SubmissionComments.class));
    }

    @Test
    void privateOrUnapprovedSubmissionCannotBeCommentedOnOrRead() {
        doThrow(new BusinessException(org.springframework.http.HttpStatus.NOT_FOUND, "Submission not found"))
                .when(submissions).requireVisible("s1");
        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setSubmissionId("s1");
        dto.setContent("Comment");
        assertThatThrownBy(() -> submissionCommentsService.addComment("user", dto)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> submissionCommentsService.getPaginatedComments("s1", 1, 10, "createdAt", "desc"))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> submissionCommentsService.countComments("s1")).isInstanceOf(BusinessException.class);
        verify(submissionCommentsMapper, never()).insert(any(SubmissionComments.class));
        verifyNoInteractions(userServiceClient);
    }


    @Test
    @DisplayName("✅ Delete comment as ADMIN")
    void testDeleteCommentByAdmin() {
        SubmissionComments comment = new SubmissionComments().setUserId("otherUser");
        when(submissionCommentsService.getById(anyString())).thenReturn(comment);
        when(submissionCommentsService.removeById(anyString())).thenReturn(true);

        submissionCommentsService.deleteComment("commentId", ctx("adminUser", "ADMIN"));

        verify(submissionCommentsService).removeById("commentId");
    }

    @Test
    @DisplayName("✅ Delete comment as OWNER")
    void testDeleteCommentByOwner() {
        SubmissionComments comment = new SubmissionComments().setUserId("ownerUser");
        when(submissionCommentsService.getById(anyString())).thenReturn(comment);
        when(submissionCommentsService.removeById(anyString())).thenReturn(true);

        submissionCommentsService.deleteComment("commentId", ctx("ownerUser", "PARTICIPANT"));

        verify(submissionCommentsService).removeById("commentId");
    }

    @Test
    @DisplayName("✅ Delete comment as ORGANIZER")
    void testDeleteCommentByOrganizer() {
        SubmissionComments comment = new SubmissionComments().setUserId("otherUser").setSubmissionId("submissionId");
        when(submissionCommentsService.getById(anyString())).thenReturn(comment);
        when(registrationServiceClient.isUserOrganizerOfSubmission(anyString(), anyString())).thenReturn(true);
        when(submissionCommentsService.removeById(anyString())).thenReturn(true);

        submissionCommentsService.deleteComment("commentId", ctx("organizerUser", "PARTICIPANT"));

        verify(submissionCommentsService).removeById("commentId");
    }

    @Test
    @DisplayName("❌ Delete comment unauthorized")
    void testDeleteCommentUnauthorized() {
        SubmissionComments comment = new SubmissionComments().setUserId("otherUser").setSubmissionId("submissionId");
        when(submissionCommentsService.getById(anyString())).thenReturn(comment);
        when(registrationServiceClient.isUserOrganizerOfSubmission(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> submissionCommentsService.deleteComment("commentId", ctx("randomUser", "PARTICIPANT")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("do not have permission"); // 👈 改成和实际异常一致
    }

    @Test
    @DisplayName("✅ Update comment successfully")
    void testUpdateCommentSuccess() {
        SubmissionComments comment = new SubmissionComments().setUserId("userId");

        when(submissionCommentsService.getById(anyString())).thenReturn(comment);

        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setContent("Updated Content");

        submissionCommentsService.updateComment("commentId", "userId", dto);

        verify(submissionCommentsMapper, times(1)).updateById(any(SubmissionComments.class));
    }

    @Test
    @DisplayName("❌ Update comment not authorized")
    void testUpdateCommentUnauthorized() {
        SubmissionComments comment = new SubmissionComments().setUserId("otherUser");
        when(submissionCommentsService.getById(anyString())).thenReturn(comment);

        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setContent("Updated Content");

        assertThatThrownBy(() -> submissionCommentsService.updateComment("commentId", "userId", dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("only edit your own comments");
    }

    @Test
    @DisplayName("✅ Get paginated comments successfully")
    void testGetPaginatedCommentsSuccess() {
        LambdaQueryChainWrapper<SubmissionComments> query = mock(LambdaQueryChainWrapper.class);
        IPage<SubmissionComments> emptyPage = new Page<>();
        emptyPage.setRecords(Collections.emptyList());

        doReturn(query).when(submissionCommentsService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.isNull(any())).thenReturn(query);
        when(query.orderBy(anyBoolean(), anyBoolean(), any(SFunction.class))).thenReturn(query);
        when(query.page(any())).thenReturn(emptyPage);
        when(query.list()).thenReturn(Collections.emptyList());

        when(userServiceClient.getUsersByIds(anyList(), any()))
                .thenReturn(ResponseEntity.ok(Collections.emptyList()));

        PageResponse<SubmissionCommentVO> result = submissionCommentsService.getPaginatedComments(
                "submissionId", 1, 10, "createdAt", "desc"
        );

        assertThat(result).isNotNull();
        assertThat(result.getData()).isEmpty();
    }

    @Test
    @DisplayName("✅ Count comments for a submission")
    void testCountCommentsSuccess() {
        when(submissionCommentsService.lambdaQuery().count()).thenReturn(5L);

        long count = submissionCommentsService.countComments("submissionId");

        assertThat(count).isEqualTo(5L);
    }

    @Test
    @DisplayName("✅ Count all comments")
    void testCountAllCommentsSuccess() {
        when(submissionCommentsMapper.countPublicComments()).thenReturn(10L);

        long count = submissionCommentsService.countAllComments();

        assertThat(count).isEqualTo(10L);
    }

    @Test
    @DisplayName("✅ Get paginated comments with existing users and parent comments")
    void testGetPaginatedComments_WithUsersAndParentComments() {
        // Arrange
        LambdaQueryChainWrapper<SubmissionComments> parentQuery = mock(LambdaQueryChainWrapper.class);
        LambdaQueryChainWrapper<SubmissionComments> replyQuery = mock(LambdaQueryChainWrapper.class);

        doReturn(parentQuery).doReturn(replyQuery).when(submissionCommentsService).lambdaQuery();

        // parent query mock
        SubmissionComments parentComment = new SubmissionComments()
                .setId("parentId")
                .setContent("Parent Comment")
                .setUserId("user1");
        IPage<SubmissionComments> parentPage = new Page<>();
        parentPage.setRecords(List.of(parentComment));
        parentPage.setTotal(1L);

        when(parentQuery.eq(any(SFunction.class), any())).thenReturn(parentQuery);
        when(parentQuery.isNull(any(SFunction.class))).thenReturn(parentQuery);
        when(parentQuery.orderBy(anyBoolean(), anyBoolean(), any(SFunction.class))).thenReturn(parentQuery);
        when(parentQuery.page(any())).thenReturn(parentPage);
        when(parentQuery.list()).thenReturn(List.of(parentComment));

        // reply query mock
        when(replyQuery.eq(any(SFunction.class), any())).thenReturn(replyQuery);
        when(replyQuery.in(any(SFunction.class), any(Collection.class))).thenReturn(replyQuery);
        when(replyQuery.orderByAsc(any(SFunction.class))).thenReturn(replyQuery);
        when(replyQuery.list()).thenReturn(List.of(
                new SubmissionComments()
                        .setId("replyId")
                        .setContent("Reply Comment")
                        .setParentId("parentId")
                        .setUserId("user2")
        ));

        when(userServiceClient.getUsersByIds(anyList(), any()))
                .thenReturn(ResponseEntity.ok(List.of(
                        UserBriefVO.builder()
                                .id("user1")
                                .name("User 1")
                                .build(),
                        UserBriefVO.builder()
                                .id("user2")
                                .name("User 2")
                                .build()
                )));

        // Act
        PageResponse<SubmissionCommentVO> result = submissionCommentsService.getPaginatedComments(
                "submissionId", 1, 10, "createdAt", "desc"
        );

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getData()).hasSize(1);

        SubmissionCommentVO parent = result.getData().get(0);
        assertThat(parent.getId()).isEqualTo("parentId");

        assertThat(parent.getReplies()).isNotNull();
        assertThat(parent.getReplies()).hasSize(1);

        SubmissionCommentVO reply = parent.getReplies().get(0);
        assertThat(reply.getId()).isEqualTo("replyId");
    }

    @Test
    void aReplyToAMissingParentIsNotCreated() {
        doReturn(null).when(submissionCommentsService).getById("missing");

        assertThatThrownBy(() -> submissionCommentsService.addComment(
                "author", commentDto("s1", "missing", "Reply")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(submissionCommentsMapper, never()).insert(any(SubmissionComments.class));
    }

    @Test
    void aReplyCannotBeNestedUnderAnotherReply() {
        doReturn(new SubmissionComments().setId("reply").setSubmissionId("s1").setParentId("root"))
                .when(submissionCommentsService).getById("reply");

        assertThatThrownBy(() -> submissionCommentsService.addComment(
                "author", commentDto("s1", "reply", "Nested reply")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(submissionCommentsMapper, never()).insert(any(SubmissionComments.class));
    }

    @Test
    void aValidReplyKeepsItsAuthorAndRootSubmission() {
        doReturn(new SubmissionComments().setId("root").setSubmissionId("s1"))
                .when(submissionCommentsService).getById("root");

        submissionCommentsService.addComment("author", commentDto("s1", "root", "Helpful reply"));

        ArgumentCaptor<SubmissionComments> saved = ArgumentCaptor.forClass(SubmissionComments.class);
        verify(submissionCommentsMapper).insert(saved.capture());
        assertThat(saved.getValue().getId()).isNotBlank();
        assertThat(saved.getValue().getSubmissionId()).isEqualTo("s1");
        assertThat(saved.getValue().getParentId()).isEqualTo("root");
        assertThat(saved.getValue().getUserId()).isEqualTo("author");
        assertThat(saved.getValue().getContent()).isEqualTo("Helpful reply");
        verify(submissions).requireVisible("s1");
    }

    @ParameterizedTest
    @MethodSource("invalidCommentBodies")
    void emptyCommentBodiesCannotBeCreated(SubmissionCommentDTO dto) {
        assertThatThrownBy(() -> submissionCommentsService.addComment("author", dto))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(submissions, submissionCommentsMapper, userServiceClient);
    }

    @ParameterizedTest
    @MethodSource("invalidCommentBodies")
    void anExistingCommentCannotBeReplacedWithAnEmptyBody(SubmissionCommentDTO dto) {
        SubmissionComments original = new SubmissionComments().setId("comment").setSubmissionId("s1")
                .setUserId("owner").setContent("Keep this comment");
        doReturn(original).when(submissionCommentsService).getById("comment");

        assertThatThrownBy(() -> submissionCommentsService.updateComment("comment", "owner", dto))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThat(original.getContent()).isEqualTo("Keep this comment");
        verify(submissionCommentsMapper, never()).updateById(any(SubmissionComments.class));
    }

    private static Stream<Arguments> invalidCommentBodies() {
        return Stream.of(
                Arguments.of((SubmissionCommentDTO) null),
                Arguments.of(commentDto("s1", null, null)),
                Arguments.of(commentDto("s1", null, "")),
                Arguments.of(commentDto("s1", null, " \t\n")));
    }

    @Test
    void anOwnerCannotMoveACommentToAnotherSubmission() {
        SubmissionComments original = new SubmissionComments().setId("comment").setSubmissionId("s1")
                .setUserId("owner").setContent("Original comment");
        doReturn(original).when(submissionCommentsService).getById("comment");

        assertThatThrownBy(() -> submissionCommentsService.updateComment(
                "comment", "owner", commentDto("other-submission", null, "Moved comment")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThat(original.getSubmissionId()).isEqualTo("s1");
        assertThat(original.getContent()).isEqualTo("Original comment");
        verify(submissionCommentsMapper, never()).updateById(any(SubmissionComments.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "PARTICIPANT"})
    void privateCommentsRejectEditsAndDeletionBeforeAnyAuthorizationLookup(String role) {
        SubmissionComments original = new SubmissionComments().setId("comment").setSubmissionId("private")
                .setUserId("owner").setContent("Private content");
        doReturn(original).when(submissionCommentsService).getById("comment");
        doThrow(new BusinessException(HttpStatus.NOT_FOUND, "Submission not found"))
                .when(submissions).requireVisible("private");

        assertThatThrownBy(() -> submissionCommentsService.deleteComment("comment", ctx("other", role)))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> submissionCommentsService.updateComment(
                "comment", "owner", commentDto("private", null, "New private content")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        assertThat(original.getContent()).isEqualTo("Private content");
        verifyNoInteractions(registrationServiceClient);
        verify(submissionCommentsService, never()).removeById(anyString());
        verify(submissionCommentsMapper, never()).updateById(any(SubmissionComments.class));
    }

    @Test
    void missingCommentsCannotBeEditedOrDeleted() {
        doReturn(null).when(submissionCommentsService).getById("missing");
        assertThatThrownBy(() -> submissionCommentsService.deleteComment("missing", ctx("owner", "PARTICIPANT")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> submissionCommentsService.updateComment(
                "missing", "owner", commentDto("s1", null, "Edited")))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(submissions, registrationServiceClient);
        verify(submissionCommentsService, never()).removeById(anyString());
        verify(submissionCommentsMapper, never()).updateById(any(SubmissionComments.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"add", "edit", "delete"})
    void aFailedDatabaseWriteDoesNotReportCommentSuccess(String operation) {
        SubmissionComments original = new SubmissionComments().setId("comment").setSubmissionId("s1")
                .setUserId("owner").setContent("Original");
        doReturn(original).when(submissionCommentsService).getById("comment");
        when(submissionCommentsMapper.insert(any(SubmissionComments.class))).thenReturn(0);
        when(submissionCommentsMapper.updateById(any(SubmissionComments.class))).thenReturn(0);
        doReturn(false).when(submissionCommentsService).removeById("comment");

        assertThatThrownBy(() -> {
            switch (operation) {
                case "add" -> submissionCommentsService.addComment("owner", commentDto("s1", null, "New"));
                case "edit" -> submissionCommentsService.updateComment("comment", "owner", commentDto("s1", null, "Edited"));
                case "delete" -> submissionCommentsService.deleteComment("comment", ctx("owner", "PARTICIPANT"));
                default -> throw new IllegalArgumentException(operation);
            }
        }).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null-response", "unavailable", "null-body"})
    void failedAuthorLookupIsAServiceFailureInsteadOfAnEmptyCommentList(String failure) {
        mockCommentPage(List.of(new SubmissionComments().setId("root").setUserId("author")
                .setSubmissionId("s1").setContent("Existing content")), List.of(), 1, 10, 1);
        ResponseEntity<List<UserBriefVO>> response = switch (failure) {
            case "null-response" -> null;
            case "unavailable" -> ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
            case "null-body" -> ResponseEntity.ok().build();
            default -> throw new IllegalArgumentException(failure);
        };
        when(userServiceClient.getUsersByIds(anyList(), isNull())).thenReturn(response);

        assertThatThrownBy(() -> submissionCommentsService.getPaginatedComments("s1", 1, 10, "createdAt", "desc"))
                .isInstanceOfSatisfying(ServiceUnavailableException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(error.getServiceName()).isEqualTo("user-service");
                    assertThat(error.getOperation()).isEqualTo("getUsersByIds");
                });
    }

    @Test
    void deletedAuthorsDoNotEraseTheirCommentOrReplyContent() {
        LocalDateTime created = LocalDateTime.of(2026, 10, 1, 12, 0);
        LocalDateTime updated = created.plusHours(1);
        mockCommentPage(List.of(new SubmissionComments().setId("root").setSubmissionId("s1")
                        .setUserId("deleted-root-author").setContent("Root content")
                        .setCreatedAt(created).setUpdatedAt(updated)),
                List.of(new SubmissionComments().setId("reply").setParentId("root").setSubmissionId("s1")
                        .setUserId("deleted-reply-author").setContent("Reply content")
                        .setCreatedAt(created).setUpdatedAt(updated)), 1, 10, 1);
        when(userServiceClient.getUsersByIds(anyList(), isNull())).thenReturn(ResponseEntity.ok(List.of()));

        PageResponse<SubmissionCommentVO> result = submissionCommentsService.getPaginatedComments("s1", 1, 10, "createdAt", "desc");
        assertThat(result.getData()).hasSize(1);
        SubmissionCommentVO root = result.getData().getFirst();
        assertThat(root.getContent()).isEqualTo("Root content");
        assertThat(root.getUserId()).isEqualTo("deleted-root-author");
        assertThat(root.getUserName()).isNull();
        assertThat(root.getAvatarUrl()).isNull();
        assertThat(root.getCreatedAt()).isEqualTo(created);
        assertThat(root.getUpdatedAt()).isEqualTo(updated);
        assertThat(root.getReplies()).hasSize(1);
        SubmissionCommentVO reply = root.getReplies().getFirst();
        assertThat(reply.getContent()).isEqualTo("Reply content");
        assertThat(reply.getUserId()).isEqualTo("deleted-reply-author");
        assertThat(reply.getParentId()).isEqualTo("root");
        assertThat(reply.getUserName()).isNull();
        assertThat(reply.getAvatarUrl()).isNull();
    }

    @ParameterizedTest
    @MethodSource("commentSorting")
    void paginationKeepsTheRequestedRangeAndUsesAnAllowedSortColumn(String sortBy, String order,
                                                                  boolean ascending, boolean updatedAt) {
        LambdaQueryChainWrapper<SubmissionComments> query = mockCommentPage(List.of(), List.of(), 2, 2, 5);

        PageResponse<SubmissionCommentVO> result = submissionCommentsService.getPaginatedComments("s1", 2, 2, sortBy, order);
        ArgumentCaptor<IPage<SubmissionComments>> requestedPage = ArgumentCaptor.forClass(IPage.class);
        verify(query).page(requestedPage.capture());
        assertThat(requestedPage.getValue().getCurrent()).isEqualTo(2);
        assertThat(requestedPage.getValue().getSize()).isEqualTo(2);
        ArgumentCaptor<SFunction<SubmissionComments, ?>> column = ArgumentCaptor.forClass(SFunction.class);
        verify(query).orderBy(eq(true), eq(ascending), column.capture());
        LocalDateTime created = LocalDateTime.of(2026, 10, 1, 12, 0);
        SubmissionComments probe = new SubmissionComments().setCreatedAt(created).setUpdatedAt(created.plusDays(1));
        assertThat(column.getValue().apply(probe)).isEqualTo(updatedAt ? probe.getUpdatedAt() : probe.getCreatedAt());
        assertThat(result.getTotal()).isEqualTo(5);
        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(2);
        assertThat(result.getPages()).isEqualTo(3);
        verifyNoInteractions(userServiceClient);
    }

    private static Stream<Arguments> commentSorting() {
        return Stream.of(
                Arguments.of("updatedAt", "ASC", true, true),
                Arguments.of("UPDATEDAT", "desc", false, true),
                Arguments.of("untrusted-column", "asc", true, false),
                Arguments.of(null, null, false, false));
    }

    @ParameterizedTest
    @MethodSource("invalidPages")
    void illegalPageRangesAreRejectedBeforeCommentOrAuthorQueries(int page, int size) {
        assertThatThrownBy(() -> submissionCommentsService.getPaginatedComments("s1", page, size, "createdAt", "desc"))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(submissionCommentsService, never()).lambdaQuery();
        verifyNoInteractions(userServiceClient, submissionCommentsMapper);
    }

    private static Stream<Arguments> invalidPages() {
        return Stream.of(Arguments.of(0, 10), Arguments.of(-1, 10), Arguments.of(1, 0),
                Arguments.of(1, -1), Arguments.of(1, 101));
    }

    @Test
    void aLargeReplyThreadRespectsTheUserLookupBatchLimit() {
        SubmissionComments root = new SubmissionComments().setId("root").setSubmissionId("s1")
                .setUserId("root-author").setContent("Root content");
        List<SubmissionComments> replies = IntStream.range(0, 100)
                .mapToObj(i -> new SubmissionComments().setId("reply-" + i).setParentId("root")
                        .setSubmissionId("s1").setUserId("reply-author-" + i).setContent("Reply " + i)).toList();
        mockCommentPage(List.of(root), replies, 1, 10, 1);
        List<List<String>> batches = new ArrayList<>();
        when(userServiceClient.getUsersByIds(anyList(), isNull())).thenAnswer(call -> {
            List<String> ids = call.getArgument(0);
            batches.add(List.copyOf(ids));
            return ResponseEntity.ok(ids.stream().map(id -> UserBriefVO.builder().id(id).name("Author " + id).build()).toList());
        });

        PageResponse<SubmissionCommentVO> result = submissionCommentsService.getPaginatedComments("s1", 1, 10, "createdAt", "desc");
        assertThat(batches).hasSize(2);
        assertThat(batches).allSatisfy(ids -> assertThat(ids).hasSizeBetween(1, 100));
        List<String> expectedAuthors = new ArrayList<>();
        expectedAuthors.add("root-author");
        replies.forEach(reply -> expectedAuthors.add(reply.getUserId()));
        assertThat(batches.stream().flatMap(List::stream).toList()).containsExactlyInAnyOrderElementsOf(expectedAuthors);
        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getData()).hasSize(1);
        assertThat(result.getData().getFirst().getReplies()).hasSize(100)
                .allSatisfy(reply -> assertThat(reply.getUserName()).isEqualTo("Author " + reply.getUserId()));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \t"})
    void commentCountsRejectBlankScopeInsteadOfCountingEverything(String id) {
        assertThatThrownBy(() -> submissionCommentsService.countComments(id))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> submissionCommentsService.countCompetitionComments(id))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(submissions, submissionCommentsMapper);
        verify(submissionCommentsService, never()).lambdaQuery();
    }

    @Test
    void competitionCommentCountsStayWithinTheRequestedCompetition() {
        when(submissionCommentsMapper.countCompetitionComments("competition-1")).thenReturn(7L);
        assertThat(submissionCommentsService.countCompetitionComments("competition-1")).isEqualTo(7);
        verify(submissionCommentsMapper).countCompetitionComments("competition-1");
        verify(submissionCommentsMapper, never()).countPublicComments();
    }

    private static SubmissionCommentDTO commentDto(String submissionId, String parentId, String content) {
        SubmissionCommentDTO dto = new SubmissionCommentDTO();
        dto.setSubmissionId(submissionId);
        dto.setParentId(parentId);
        dto.setContent(content);
        return dto;
    }

    private LambdaQueryChainWrapper<SubmissionComments> mockCommentPage(List<SubmissionComments> roots,
                                                                      List<SubmissionComments> replies,
                                                                      int page, int size, long total) {
        LambdaQueryChainWrapper<SubmissionComments> rootQuery = mock(LambdaQueryChainWrapper.class);
        LambdaQueryChainWrapper<SubmissionComments> replyQuery = mock(LambdaQueryChainWrapper.class);
        doReturn(rootQuery).doReturn(replyQuery).when(submissionCommentsService).lambdaQuery();
        IPage<SubmissionComments> result = new Page<>(page, size, total);
        result.setRecords(roots);
        when(rootQuery.eq(any(SFunction.class), any())).thenReturn(rootQuery);
        when(rootQuery.isNull(any(SFunction.class))).thenReturn(rootQuery);
        when(rootQuery.orderBy(anyBoolean(), anyBoolean(), any(SFunction.class))).thenReturn(rootQuery);
        when(rootQuery.page(any())).thenReturn(result);
        when(replyQuery.eq(any(SFunction.class), any())).thenReturn(replyQuery);
        when(replyQuery.in(any(SFunction.class), any(Collection.class))).thenReturn(replyQuery);
        when(replyQuery.orderByAsc(any(SFunction.class))).thenReturn(replyQuery);
        when(replyQuery.list()).thenReturn(replies);
        return rootQuery;
    }

}
