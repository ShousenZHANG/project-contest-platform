package com.w16a.danish.user.mapper;

import com.w16a.danish.user.domain.po.Users;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Insert;


/**
 * @author Eddy ZHANG
 * @date 2025/03/16
 * @description UsersMapper
 */
public interface UsersMapper extends BaseMapper<Users> {

    @Select("SELECT user_id FROM oauth_accounts WHERE provider=#{provider} AND subject=#{subject}")
    String findOAuthUser(@Param("provider") String provider, @Param("subject") String subject);

    @Insert("INSERT INTO oauth_accounts (provider,subject,user_id) VALUES (#{provider},#{subject},#{userId})")
    int bindOAuthAccount(@Param("provider") String provider, @Param("subject") String subject, @Param("userId") String userId);

    @Select("SELECT id FROM roles WHERE name='ADMIN' FOR UPDATE")
    Integer lockAdministratorRole();

    @Select("SELECT id FROM users WHERE id=#{userId} FOR UPDATE")
    String lockAccount(@Param("userId") String userId);

    @Select("SELECT (EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id " +
            "WHERE ur.user_id=#{userId} AND r.name='ADMIN') AND " +
            "(SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.name='ADMIN') <= 1)")
    boolean isLastAdministrator(@Param("userId") String userId);

    @Select("SELECT (EXISTS(SELECT 1 FROM competition_organizers WHERE user_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM competition_judges WHERE user_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM competition_participants WHERE user_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM submission_records WHERE user_id=#{userId} OR reviewed_by=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM submission_judges WHERE judge_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM submission_comments WHERE user_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM submission_votes WHERE user_id=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM team WHERE created_by=#{userId}) OR " +
            "EXISTS(SELECT 1 FROM team_members WHERE user_id=#{userId}))")
    boolean hasRetainedHistory(@Param("userId") String userId);
}
