package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;

import java.time.Instant;

public record CustomerProductResponse(
        Long id,
        Long tenantId,
        Long customerId,
        String customerName,
        Long productId,
        String productName,
        String status,
        Instant startsAt,
        Instant endsAt,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
    public static CustomerProductResponse from(CustomerProductEntity cp) {
        return new CustomerProductResponse(
                cp.getId(),
                cp.getTenant().getId(),
                cp.getCustomer().getId(),
                cp.getCustomer().getName(),
                cp.getProduct().getId(),
                cp.getProduct().getName(),
                cp.getStatus().name(),
                cp.getStartsAt(),
                cp.getEndsAt(),
                cp.getNotes(),
                cp.getCreatedAt(),
                cp.getUpdatedAt()
        );
    }
}
