package com.w16a.danish.judge.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/** A transaction-held row lock serializes scoring with the one immutable award run. */
public interface AwardRunMapper {
    @Insert("INSERT INTO competition_award_runs (competition_id) VALUES (#{competitionId}) "
            + "ON DUPLICATE KEY UPDATE competition_id = VALUES(competition_id)")
    int ensureRun(@Param("competitionId") String competitionId);

    @Select("SELECT awarded_at FROM competition_award_runs WHERE competition_id = #{competitionId} FOR UPDATE")
    LocalDateTime lockRun(@Param("competitionId") String competitionId);

    @Select("SELECT awarded_at FROM competition_award_runs WHERE competition_id = #{competitionId}")
    LocalDateTime awardedAt(@Param("competitionId") String competitionId);

    @Update("UPDATE competition_award_runs SET awarded_at = CURRENT_TIMESTAMP "
            + "WHERE competition_id = #{competitionId} AND awarded_at IS NULL")
    int markAwarded(@Param("competitionId") String competitionId);

    @Update("UPDATE competition_award_runs SET score_version = score_version + 1 WHERE competition_id = #{competitionId}")
    int incrementScoreVersion(@Param("competitionId") String competitionId);

    @Select("SELECT score_version FROM competition_award_runs WHERE competition_id = #{competitionId}")
    long scoreVersion(@Param("competitionId") String competitionId);
}
