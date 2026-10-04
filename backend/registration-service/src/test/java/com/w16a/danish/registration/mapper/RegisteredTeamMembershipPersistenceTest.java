package com.w16a.danish.registration.mapper;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RegisteredTeamMembershipPersistenceTest {
    @Test
    void membershipIncludesTheRegisteredTeamsCreatorAndMembersButNotAnotherTeamsMembers() {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:team_acl_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        var jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("CREATE TABLE team(id VARCHAR(36) PRIMARY KEY,created_by VARCHAR(36))");
        jdbc.execute("CREATE TABLE team_members(team_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE competition_teams(competition_id VARCHAR(36),team_id VARCHAR(36))");
        jdbc.update("INSERT INTO team VALUES ('registered','creator'),('other','other-creator')");
        jdbc.update("INSERT INTO team_members VALUES ('registered','member'),('other','outsider')");
        jdbc.update("INSERT INTO competition_teams VALUES ('c1','registered')");
        var configuration = new MybatisConfiguration();
        configuration.setEnvironment(new Environment("h2", new JdbcTransactionFactory(), dataSource));
        configuration.addMapper(CompetitionParticipantsMapper.class);
        try (var session = new MybatisSqlSessionFactoryBuilder().build(configuration).openSession()) {
            var mapper = session.getMapper(CompetitionParticipantsMapper.class);
            assertThat(mapper.hasRegisteredTeamMembership("c1", "creator")).isTrue();
            assertThat(mapper.hasRegisteredTeamMembership("c1", "member")).isTrue();
            assertThat(mapper.hasRegisteredTeamMembership("c1", "outsider")).isFalse();
            assertThat(mapper.hasRegisteredTeamMembership("other-competition", "creator")).isFalse();
        }
    }
}
