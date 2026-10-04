package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import javax.sql.DataSource;
import java.time.Clock;
import java.util.List;

@AutoConfiguration(after = {DataSourceAutoConfiguration.class,
        org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration.class,
        org.springframework.boot.jackson2.autoconfigure.Jackson2AutoConfiguration.class})
@ConditionalOnBean(DataSource.class)
@EnableScheduling
public class DurableTaskAutoConfiguration {
    @Bean @ConditionalOnBean(RabbitTemplate.class)
    NotificationOutbox notificationOutbox(RabbitTemplate rabbit, ObjectMapper json) {
        rabbit.setMandatory(true);
        return new NotificationOutbox(rabbit, json);
    }
    @Bean
    DurableTasks durableTasks(DataSource datasource, ObjectMapper json, Environment env, List<DurableTaskHandler> handlers) {
        return new DurableTasks(new JdbcTemplate(datasource), json, Clock.systemUTC(), env.getRequiredProperty("spring.application.name"), handlers);
    }
}
