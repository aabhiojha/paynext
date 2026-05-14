package np.com.abhishekojha.coremonolith.modules.product.dto;

import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        Long tenantId,
        String name,
        String description,
        BigDecimal price,
        String currency,
        String billingCadence,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductResponse from(ProductEntity p) {
        return new ProductResponse(
                p.getId(),
                p.getTenant().getId(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getCurrency(),
                p.getBillingCadence().name(),
                p.getStatus().name(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
