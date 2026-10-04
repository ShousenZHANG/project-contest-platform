package com.w16a.danish.interaction.mapper;

import com.w16a.danish.interaction.domain.po.SubmissionVotes;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 *
 * This interface serves as a Mapper for the SubmissionVotes entity.
 *
 * @author Eddy ZHANG
 * @date 2025/04/08
 */
public interface SubmissionVotesMapper extends BaseMapper<SubmissionVotes> {

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM submission_votes v JOIN submission_records s ON s.id=v.submission_id " +
            "WHERE s.competition_id=#{competitionId}")
    long countCompetitionVotes(@org.apache.ibatis.annotations.Param("competitionId") String competitionId);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM submission_votes v JOIN submission_records s ON s.id=v.submission_id " +
            "JOIN competitions c ON c.id=s.competition_id WHERE c.is_public=TRUE AND s.review_status='APPROVED'")
    long countPublicVotes();

}
