package com.w16a.danish.user.mapper;

import com.w16a.danish.user.domain.po.Team;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * <p>
 * Table for team information Mapper 接口
 * </p>
 *
 * @author Eddy
 * @since 2025-04-16
 */
public interface TeamMapper extends BaseMapper<Team> {

    @Select("SELECT id FROM users WHERE id=#{userId} FOR UPDATE")
    String lockAccount(@Param("userId") String userId);

    @Select("SELECT id FROM team WHERE id=#{teamId} FOR UPDATE")
    String lockTeam(@Param("teamId") String teamId);

    @Select("SELECT (EXISTS(SELECT 1 FROM submission_records WHERE team_id=#{teamId}) OR " +
            "EXISTS(SELECT 1 FROM competition_teams WHERE team_id=#{teamId}))")
    boolean hasCompetitionHistory(@Param("teamId") String teamId);

    @Select("SELECT EXISTS(SELECT 1 FROM submission_records WHERE team_id=#{teamId})")
    boolean hasSubmissionHistory(@Param("teamId") String teamId);

}
