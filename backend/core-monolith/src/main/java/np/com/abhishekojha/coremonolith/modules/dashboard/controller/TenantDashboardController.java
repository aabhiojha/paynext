package np.com.abhishekojha.coremonolith.modules.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.audit.dto.AuditLogResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.OverduePlanResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.ReminderStatsResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.TenantSummaryResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.UpcomingReminderResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Tenant analytics and metrics")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
public class TenantDashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Summary counts", description = "Total customers, products, and plans by status")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/summary")
    public ResponseEntity<TenantSummaryResponse> summary(@PathVariable Long tenantId) {
        return ResponseEntity.ok(dashboardService.getSummary(tenantId));
    }

    @Operation(summary = "Reminder delivery stats", description = "Sent/failed/skipped counts for a date range (default: last 30 days)")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/reminders")
    public ResponseEntity<ReminderStatsResponse> reminderStats(
            @PathVariable Long tenantId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(dashboardService.getReminderStats(tenantId, from, to));
    }

    @Operation(summary = "Upcoming reminders", description = "Plans with payments due within the next 7 days")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/upcoming-reminders")
    public ResponseEntity<List<UpcomingReminderResponse>> upcomingReminders(@PathVariable Long tenantId) {
        return ResponseEntity.ok(dashboardService.getUpcomingReminders(tenantId));
    }

    @Operation(summary = "Overdue plans", description = "Active plans past their due date")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/overdue")
    public ResponseEntity<List<OverduePlanResponse>> overduePlans(@PathVariable Long tenantId) {
        return ResponseEntity.ok(dashboardService.getOverduePlans(tenantId));
    }

    @Operation(summary = "Recent activity", description = "Last 10 audit log entries for the tenant")
    @ApiResponse(responseCode = "200", description = "OK")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN')")
    @GetMapping("/recent-activity")
    public ResponseEntity<List<AuditLogResponse>> recentActivity(@PathVariable Long tenantId) {
        return ResponseEntity.ok(dashboardService.getRecentActivity(tenantId));
    }
}
