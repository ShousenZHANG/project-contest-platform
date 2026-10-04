package com.w16a.danish.judge.mapper;

import com.w16a.danish.judge.domain.po.SubmissionJudges;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;
import java.util.Set;

/**
 * <p>
 * Judge records for submissions Mapper
 * </p>
 *
 * @author Eddy
 * @since 2025-04-18
 */
public interface SubmissionJudgesMapper extends BaseMapper<SubmissionJudges> {

    @Select("SELECT DISTINCT cj.user_id FROM competition_judges cj "
            + "JOIN user_roles ur ON ur.user_id = cj.user_id JOIN roles r ON r.id = ur.role_id "
            + "WHERE cj.competition_id = #{competitionId} AND LOWER(r.name) = 'judge' "
            + "AND NOT EXISTS (SELECT 1 FROM competition_organizers co "
            + "WHERE co.competition_id = cj.competition_id AND co.user_id = cj.user_id)")
    Set<String> selectValidJudgeIds(@Param("competitionId") String competitionId);

}
