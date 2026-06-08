package np.com.abhishekojha.coremonolith.modules.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin.AdminSummaryResponse;
import np.com.abhishekojha.coremonolith.modules.dashboard.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Admin Dashboard", description = "Platform-wide analytics for the Super Admin. All endpoints require the SUPER_ADMIN role.")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    @Operation(
        summary = "Platform summary",
        description = """
            Returns a single aggregated snapshot of the entire platform:
            • **tenants** — counts by status (active / suspended / archived), newly registered this week, and subscriptions expiring this week
            • **users** — total and active user counts across all tenants
            • **remainders** — reminder delivery stats (sent, failed, skipped, pending) and the computed failure rate

            This endpoint runs ~11 COUNT queries behind the scenes and should be cached or called sparingly.
            """
    )
    @ApiResponse(
        responseCode = "200",
        description = "Summary object containing tenants, users, and reminders sub-objects"
    )
    @GetMapping("/summary")
    public ResponseEntity<AdminSummaryResponse> summary() {
        return ResponseEntity.ok(dashboardService.getAdminSummary());
    }
}
