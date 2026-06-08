package np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Builder
@Setter
public class AdminSummaryResponse {
    private GlobalTenantsSummaryResponse tenants;
    private UsersSummary users;
    private RemaindersSummary remainders;
}