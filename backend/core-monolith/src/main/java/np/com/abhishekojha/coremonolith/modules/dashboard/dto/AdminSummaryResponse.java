package np.com.abhishekojha.coremonolith.modules.dashboard.dto;

public record AdminSummaryResponse(
        long activeTenants,
        long suspendedTenants,
        long archivedTenants,
        long totalUsers,
        long remindersSent,
        long remindersFailed,
        long remindersSkipped
) {}
