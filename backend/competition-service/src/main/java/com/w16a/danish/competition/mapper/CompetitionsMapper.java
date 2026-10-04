package com.w16a.danish.competition.mapper;

import com.w16a.danish.competition.domain.po.Competitions;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;


/**
 * @author Eddy ZHANG
 * @date 2025/03/18
 * @description mapper interface for Competitions
 */
public interface CompetitionsMapper extends BaseMapper<Competitions> {

    @org.apache.ibatis.annotations.Select("SELECT (EXISTS(SELECT 1 FROM competition_participants WHERE competition_id=#{competitionId} AND user_id=#{userId}) " +
            "OR EXISTS(SELECT 1 FROM competition_teams ct JOIN team t ON t.id=ct.team_id " +
            "LEFT JOIN team_members tm ON tm.team_id=t.id AND tm.user_id=#{userId} " +
            "WHERE ct.competition_id=#{competitionId} AND (t.created_by=#{userId} OR tm.id IS NOT NULL)))")
    boolean isRegisteredEntrant(@org.apache.ibatis.annotations.Param("competitionId") String competitionId,
            @org.apache.ibatis.annotations.Param("userId") String userId);

    @org.apache.ibatis.annotations.Insert("INSERT INTO competition_award_runs (competition_id) SELECT id FROM competitions WHERE id=#{id} " +
            "ON DUPLICATE KEY UPDATE competition_id=VALUES(competition_id)")
    int ensureLifecycleLock(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Select("SELECT awarded_at FROM competition_award_runs WHERE competition_id=#{id} FOR UPDATE")
    java.time.LocalDateTime lockLifecycle(@org.apache.ibatis.annotations.Param("id") String id);

}
