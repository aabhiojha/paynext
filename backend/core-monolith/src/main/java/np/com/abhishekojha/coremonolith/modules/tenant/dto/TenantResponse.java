package np.com.abhishekojha.coremonolith.modules.tenant.dto;

import np.com.abhishekojha.coremonolith.modules.platformplan.dto.TenantPlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;

import java.time.Instant;

public record TenantResponse(
        Long id,
        String name,
        String slug,
        String companyEmail,
        String timezone,
        String status,
        Instant archivedAt,
        String suspensionReason,
        String archivalReason,
        Instant createdAt,
        Instant updatedAt,
        TenantPlatformPlanResponse activePlan
) {
    public static TenantResponse from(TenantEntity t) {
        return from(t, null);
    }

    public static TenantResponse from(TenantEntity t, TenantPlatformPlanResponse activePlan) {
        return new TenantResponse(
                t.getId(),
                t.getName(),
                t.getSlug(),
                t.getCompanyEmail(),
                t.getTimezone(),
                t.getStatus().name(),
                t.getArchivedAt(),
                t.getSuspensionReason(),
                t.getArchivalReason(),
                t.getCreatedAt(),
                t.getUpdatedAt(),
                activePlan
        );
    }
}
