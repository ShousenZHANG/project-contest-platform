package com.w16a.danish.registration.mapper;

import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * Table for competition participants (many-to-many relationship) Mapper 接口
 * </p>
 *
 * @author Eddy
 * @since 2025-04-03
 */
public interface CompetitionParticipantsMapper extends BaseMapper<CompetitionParticipants> {

    @org.apache.ibatis.annotations.Select("SELECT EXISTS(SELECT 1 FROM competition_teams ct " +
            "JOIN team t ON t.id=ct.team_id WHERE ct.competition_id=#{competitionId} " +
            "AND (t.created_by=#{userId} OR EXISTS(SELECT 1 FROM team_members tm " +
            "WHERE tm.team_id=t.id AND tm.user_id=#{userId})))")
    boolean hasRegisteredTeamMembership(@org.apache.ibatis.annotations.Param("competitionId") String competitionId,
                                         @org.apache.ibatis.annotations.Param("userId") String userId);

    @org.apache.ibatis.annotations.Insert("INSERT INTO competition_award_runs (competition_id) VALUES (#{id}) " +
            "ON DUPLICATE KEY UPDATE competition_id=VALUES(competition_id)")
    int ensureLifecycleLock(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Select("SELECT awarded_at FROM competition_award_runs WHERE competition_id=#{id} FOR UPDATE")
    java.time.LocalDateTime lockLifecycle(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Select("SELECT status FROM competitions WHERE id=#{id} FOR UPDATE")
    String competitionStatus(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Select("SELECT end_date FROM competitions WHERE id=#{id} FOR UPDATE")
    java.time.LocalDateTime competitionEndDate(@org.apache.ibatis.annotations.Param("id") String id);

}
