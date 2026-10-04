package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DurableTaskAutoConfigurationTest {
    @Test
    void databaseServicesHaveDurableTasksAndConfirmedMandatoryPublisherAdapter() {
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(DurableTaskAutoConfiguration.class))
                .withBean(DataSource.class, () -> new DriverManagerDataSource("jdbc:h2:mem:task_configuration", "sa", ""))
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withBean(RabbitTemplate.class, () -> rabbit)
                .withPropertyValues("spring.application.name=registration-service", "platform.tasks.initial-delay-ms=3600000")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(DurableTasks.class).hasSingleBean(NotificationOutbox.class);
                    verify(rabbit).setMandatory(true);
                });
    }

    @Test
    void servicesWithoutDatabaseDoNotGetTheTaskWorker() {
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(DurableTaskAutoConfiguration.class))
                .run(context -> assertThat(context).hasNotFailed().doesNotHaveBean(DurableTasks.class));
    }
}
