package com.w16a.danish.registration.mapper;

import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * Submission records by participants for competitions Mapper 接口
 * </p>
 *
 * @author Eddy
 * @since 2025-04-03
 */
public interface SubmissionRecordsMapper extends BaseMapper<SubmissionRecords> {

    // Kept in one place so sorting cannot rank legacy or removed-Judge scores as current scores.
    String CURRENT_SCORE_SOURCE = "EXISTS (SELECT 1 FROM submission_judges sj " +
            "JOIN competition_judges cj ON cj.competition_id=sj.competition_id AND cj.user_id=sj.judge_id " +
            "JOIN user_roles ur ON ur.user_id=sj.judge_id JOIN roles r ON r.id=ur.role_id " +
            "WHERE sj.submission_id=submission_records.id AND sj.competition_id=submission_records.competition_id " +
            "AND sj.submission_revision=submission_records.revision AND sj.score_schema_version=1 " +
            "AND sj.total_score BETWEEN 0 AND 10 " +
            "AND LOWER(r.name)='judge' AND NOT EXISTS (SELECT 1 FROM competition_organizers co " +
            "WHERE co.competition_id=sj.competition_id AND co.user_id=sj.judge_id))";

    String CURRENT_SCORE = "CASE WHEN submission_records.review_status='APPROVED' " +
            "AND submission_records.score_version>0 AND submission_records.revision>=0 " +
            "AND submission_records.total_score BETWEEN 0 AND 10 AND " + CURRENT_SCORE_SOURCE +
            " THEN submission_records.total_score ELSE NULL END";

    @org.apache.ibatis.annotations.Select("<script>SELECT submission_records.id AS submission_id, sj.judge_id, sj.id AS judge_record_id, " +
            "c.scoring_criteria AS configured_criteria, sj.total_score AS judge_total, d.id AS detail_id, " +
            "d.submission_id AS detail_submission_id, d.criterion, d.score AS criterion_score " +
            "FROM submission_records JOIN competitions c ON c.id=submission_records.competition_id " +
            "JOIN submission_judges sj ON sj.submission_id=submission_records.id " +
            "AND sj.competition_id=submission_records.competition_id " +
            "AND sj.submission_revision=submission_records.revision AND sj.score_schema_version=1 " +
            "LEFT JOIN submission_judge_scores d ON d.judge_record_id=sj.id " +
            "WHERE submission_records.id IN " +
            "<foreach collection='ids' item='id' open='(' separator=',' close=')'>#{id}</foreach> " +
            "AND EXISTS(SELECT 1 FROM competition_judges cj JOIN user_roles ur ON ur.user_id=cj.user_id " +
            "JOIN roles r ON r.id=ur.role_id WHERE cj.competition_id=sj.competition_id AND cj.user_id=sj.judge_id " +
            "AND LOWER(r.name)='judge') AND NOT EXISTS(SELECT 1 FROM competition_organizers co " +
            "WHERE co.competition_id=sj.competition_id AND co.user_id=sj.judge_id) " +
            "AND <![CDATA[" + CURRENT_SCORE + " IS NOT NULL]]></script>")
    @org.apache.ibatis.annotations.Results({
            @org.apache.ibatis.annotations.Result(column="submission_id", property="submissionId"),
            @org.apache.ibatis.annotations.Result(column="judge_id", property="judgeId"),
            @org.apache.ibatis.annotations.Result(column="judge_record_id", property="judgeRecordId"),
            @org.apache.ibatis.annotations.Result(column="configured_criteria", property="configuredCriteria"),
            @org.apache.ibatis.annotations.Result(column="judge_total", property="judgeTotal"),
            @org.apache.ibatis.annotations.Result(column="detail_id", property="detailId"),
            @org.apache.ibatis.annotations.Result(column="detail_submission_id", property="detailSubmissionId"),
            @org.apache.ibatis.annotations.Result(column="criterion", property="criterion"),
            @org.apache.ibatis.annotations.Result(column="criterion_score", property="criterionScore")
    })
    java.util.List<com.w16a.danish.registration.domain.po.SubmissionScoreSource> selectScoreSources(
            @org.apache.ibatis.annotations.Param("ids") java.util.List<String> ids);

    @org.apache.ibatis.annotations.Select("SELECT id FROM submission_records WHERE competition_id=#{competitionId} AND " + CURRENT_SCORE + " IS NOT NULL")
    java.util.List<String> selectScoreCandidateIds(@org.apache.ibatis.annotations.Param("competitionId") String competitionId);

    @org.apache.ibatis.annotations.Select("SELECT * FROM submission_records WHERE id=#{id} FOR UPDATE")
    SubmissionRecords lockSubmission(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Select("<script>SELECT * FROM submission_records WHERE competition_id=#{competitionId} " +
            "<choose><when test='teamId != null'>AND team_id=#{teamId}</when>" +
            "<otherwise>AND user_id=#{userId}</otherwise></choose> FOR UPDATE</script>")
    SubmissionRecords lockOwnedSubmission(@org.apache.ibatis.annotations.Param("competitionId") String competitionId,
                                          @org.apache.ibatis.annotations.Param("userId") String userId,
                                          @org.apache.ibatis.annotations.Param("teamId") String teamId);

    @org.apache.ibatis.annotations.Select("SELECT id FROM competition_participants WHERE competition_id=#{competitionId} AND user_id=#{userId} FOR UPDATE")
    String lockIndividualRegistration(@org.apache.ibatis.annotations.Param("competitionId") String competitionId,
                                      @org.apache.ibatis.annotations.Param("userId") String userId);

    @org.apache.ibatis.annotations.Select("SELECT id FROM competition_teams WHERE competition_id=#{competitionId} AND team_id=#{teamId} FOR UPDATE")
    String lockTeamRegistration(@org.apache.ibatis.annotations.Param("competitionId") String competitionId,
                                @org.apache.ibatis.annotations.Param("teamId") String teamId);

    @org.apache.ibatis.annotations.Insert("INSERT INTO competition_award_runs (competition_id) VALUES (#{id}) " +
            "ON DUPLICATE KEY UPDATE competition_id=VALUES(competition_id)")
    int ensureLifecycleLock(@org.apache.ibatis.annotations.Param("id") String id);
    @org.apache.ibatis.annotations.Select("SELECT awarded_at FROM competition_award_runs WHERE competition_id=#{id} FOR UPDATE")
    java.time.LocalDateTime lockLifecycle(@org.apache.ibatis.annotations.Param("id") String id);
    @org.apache.ibatis.annotations.Select("SELECT status FROM competitions WHERE id=#{id} FOR UPDATE")
    String competitionStatus(@org.apache.ibatis.annotations.Param("id") String id);

    @org.apache.ibatis.annotations.Update("UPDATE submission_records SET total_score=#{score},score_version=#{version},updated_at=CURRENT_TIMESTAMP " +
            "WHERE id=#{id} AND review_status='APPROVED' AND revision=#{revision} AND score_version < #{version}")
    int updateScoreVersioned(@org.apache.ibatis.annotations.Param("id") String id,
                            @org.apache.ibatis.annotations.Param("score") java.math.BigDecimal score,
                            @org.apache.ibatis.annotations.Param("version") long version,
                            @org.apache.ibatis.annotations.Param("revision") int revision);

}
