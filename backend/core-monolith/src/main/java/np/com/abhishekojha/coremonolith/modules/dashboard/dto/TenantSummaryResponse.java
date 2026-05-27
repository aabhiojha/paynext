package np.com.abhishekojha.coremonolith.modules.dashboard.dto;

public record TenantSummaryResponse(
        long totalCustomers,
        long totalProducts,
        long activePlans,
        long pausedPlans,
        long cancelledPlans
) {}
