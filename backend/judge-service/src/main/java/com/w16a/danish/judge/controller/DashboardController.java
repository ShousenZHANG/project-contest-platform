package com.w16a.danish.judge.controller;

import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.service.IDashboardService;
import com.w16a.danish.common.context.CurrentUser;
import com.w16a.danish.common.context.RequestContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;


/**
 *
 * This controller handles dashboard-related APIs, including competition statistics,
 *
 * @author Eddy ZHANG
 * @date 2025/04/20
 */
@Slf4j
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "APIs for competition statistics, organizer overview, and system overview")
public class DashboardController {

    private final IDashboardService dashboardService;

    @Operation(
            summary = "Public: Get competition statistics overview",
            description = "Retrieve aggregate statistics for a public competition. Personal submission information is never included.",
            parameters = {
                    @Parameter(name = "competitionId", description = "Competition ID (UUID)", required = true, in = ParameterIn.QUERY)
            },
            responses = {
                    @ApiResponse(responseCode = "200", description = "Competition statistics retrieved successfully",
                            content = @Content(schema = @Schema(implementation = CompetitionDashboardVO.class))),
                    @ApiResponse(responseCode = "404", description = "Competition not found")
            }
    )
    @GetMapping("/public/statistics")
    public ResponseEntity<CompetitionDashboardVO> getCompetitionStatistics(
            @RequestParam("competitionId") String competitionId) {

        CompetitionDashboardVO dashboard = dashboardService.getCompetitionStatistics(competitionId, null);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/statistics")
    public ResponseEntity<CompetitionDashboardVO> getManagedCompetitionStatistics(
            @CurrentUser RequestContext ctx, @RequestParam String competitionId) {
        return ResponseEntity.ok(dashboardService.getManagedCompetitionStatistics(ctx, competitionId));
    }

    @Operation(
            summary = "Public: Get platform-wide competition dashboard overview",
            description = "Retrieve overall statistics across all competitions: total competitions, total participants, total submissions, participant trends, submission trends.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Platform dashboard data retrieved successfully",
                            content = @Content(schema = @Schema(implementation = PlatformDashboardVO.class)))
            }
    )
    @GetMapping("/public/platform-overview")
    public ResponseEntity<PlatformDashboardVO> getPlatformDashboard() {
        PlatformDashboardVO dashboard = dashboardService.getPlatformDashboard();
        return ResponseEntity.ok(dashboard);
    }

}
