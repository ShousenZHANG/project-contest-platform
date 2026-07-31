package com.w16a.danish.common.domain.enums;

import com.w16a.danish.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Two of these statuses gate behaviour rather than describe it: {@code isRegistrable} decides who
 * may enter a Competition, and {@code isSubmittable} decides who may upload work. Both are asserted
 * exhaustively so adding a sixth status forces a decision here instead of defaulting to "no".
 */
class CompetitionStatusTest {

    @ParameterizedTest
    @ValueSource(strings = {"ONGOING", "ongoing", "OnGoing"})
    @DisplayName("fromString accepts any casing, because statuses arrive as free-form query params")
    void fromStringIgnoresCase(String input) {
        assertThat(CompetitionStatus.fromString(input)).isEqualTo(CompetitionStatus.ONGOING);
    }

    @ParameterizedTest
    @EnumSource(CompetitionStatus.class)
    @DisplayName("Every status round-trips through its own value")
    void everyStatusRoundTrips(CompetitionStatus status) {
        assertThat(CompetitionStatus.fromString(status.getValue())).isEqualTo(status);
    }

    @Test
    @DisplayName("An unknown status is the caller's fault — 400, naming what was sent")
    void unknownStatusIsBadRequest() {
        assertThatThrownBy(() -> CompetitionStatus.fromString("FINISHED"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("FINISHED")
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThatThrownBy(() -> CompetitionStatus.fromString(null))
                .isInstanceOf(BusinessException.class);
    }

    @ParameterizedTest
    @EnumSource(CompetitionStatus.class)
    @DisplayName("Registration is open while UPCOMING or ONGOING, and closed for everything else")
    void registrationWindow(CompetitionStatus status) {
        boolean expected = status == CompetitionStatus.UPCOMING || status == CompetitionStatus.ONGOING;

        assertThat(CompetitionStatus.isRegistrable(status)).isEqualTo(expected);
    }

    @ParameterizedTest
    @EnumSource(CompetitionStatus.class)
    @DisplayName("Only an ONGOING competition accepts submissions — UPCOMING deliberately does not")
    void submissionWindow(CompetitionStatus status) {
        assertThat(CompetitionStatus.isSubmittable(status)).isEqualTo(status == CompetitionStatus.ONGOING);
    }

    @Test
    @DisplayName("A null status is neither registrable nor submittable, rather than throwing")
    void nullStatusIsClosed() {
        assertThat(CompetitionStatus.isRegistrable(null)).isFalse();
        assertThat(CompetitionStatus.isSubmittable(null)).isFalse();
    }
}
