package com.w16a.danish.interaction.mapper;

import com.w16a.danish.interaction.domain.po.SubmissionComments;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 *
 * SubmissionCommentsMapper mapper interface
 *
 * @author Eddy ZHANG
 * @date 2025/04/08
 */
public interface SubmissionCommentsMapper extends BaseMapper<SubmissionComments> {

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM submission_comments m JOIN submission_records s ON s.id=m.submission_id " +
            "WHERE s.competition_id=#{competitionId}")
    long countCompetitionComments(@org.apache.ibatis.annotations.Param("competitionId") String competitionId);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM submission_comments m JOIN submission_records s ON s.id=m.submission_id " +
            "JOIN competitions c ON c.id=s.competition_id WHERE c.is_public=TRUE AND s.review_status='APPROVED'")
    long countPublicComments();

}
