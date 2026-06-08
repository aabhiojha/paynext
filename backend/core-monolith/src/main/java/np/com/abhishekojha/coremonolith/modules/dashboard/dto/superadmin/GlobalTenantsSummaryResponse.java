package np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@Schema(description = "Aggregated tenant counts grouped by status and time-based windows")
public class GlobalTenantsSummaryResponse {
    @Schema(description = "Tenants with ACTIVE status and not deleted", example = "42")
    private long active;

    @Schema(description = "Tenants with SUSPENDED status and not deleted", example = "3")
    private long suspended;

    @Schema(description = "Tenants with ARCHIVED status and not deleted", example = "7")
    private long archived;

    @Schema(description = "Tenants created within the last 7 days (not archived)", example = "5")
    private long newThisWeek;

    @Schema(description = "Active plan subscriptions expiring within the next 7 days", example = "2")
    private long expiringThisWeek;
}
