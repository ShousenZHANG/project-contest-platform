package com.w16a.danish.common.context;

import com.w16a.danish.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Every authorisation decision in the platform starts here. The role arrives as a header string
 * written by the gateway, so the comparisons are deliberately case-insensitive — these tests pin
 * that, because tightening it later would silently lock out whichever service spells it
 * differently.
 */
class RequestContextTest {

    @ParameterizedTest(name = "role {0} is recognised as {1}")
    @CsvSource({
            "ADMIN,       admin",
            "admin,       admin",
            "Organizer,   organizer",
            "JUDGE,       judge",
            "participant, participant",
    })
    @DisplayName("Role predicates ignore case, because the header's spelling is not guaranteed")
    void rolePredicatesIgnoreCase(String header, String expected) {
        RequestContext ctx = new RequestContext("u1", header);

        assertThat(ctx.isAdmin()).isEqualTo(expected.equals("admin"));
        assertThat(ctx.isOrganizer()).isEqualTo(expected.equals("organizer"));
        assertThat(ctx.isJudge()).isEqualTo(expected.equals("judge"));
        assertThat(ctx.isParticipant()).isEqualTo(expected.equals("participant"));
    }

    @Test
    @DisplayName("hasAnyRole matches on any one of the supplied roles")
    void hasAnyRoleMatchesOne() {
        RequestContext organizer = new RequestContext("u1", "ORGANIZER");

        assertThat(organizer.hasAnyRole("ADMIN", "ORGANIZER")).isTrue();
        assertThat(organizer.hasAnyRole("admin", "organizer")).isTrue();
        assertThat(organizer.hasAnyRole("JUDGE", "PARTICIPANT")).isFalse();
        assertThat(organizer.hasAnyRole()).isFalse();
    }

    @Test
    @DisplayName("requireAnyRole passes silently when the caller holds one of them")
    void requireAnyRoleAllowsAuthorised() {
        RequestContext admin = new RequestContext("u1", "ADMIN");

        assertThatCode(() -> admin.requireAnyRole("ADMIN", "ORGANIZER")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("requireAnyRole is 403 and names what was needed — not 401, which means unauthenticated")
    void requireAnyRoleRejectsWithForbidden() {
        RequestContext participant = new RequestContext("u1", "PARTICIPANT");

        assertThatThrownBy(() -> participant.requireAnyRole("ADMIN", "ORGANIZER"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ADMIN")
                .hasMessageContaining("ORGANIZER")
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
