package np.com.abhishekojha.coremonolith.modules.dashboard.dto;

import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;

import java.math.BigDecimal;
import java.time.Instant;

public record OverduePlanResponse(
        Long customerProductId,
        String customerName,
        String customerEmail,
        String productName,
        String currency,
        BigDecimal amount,
        Instant endsAt
) {
    public static OverduePlanResponse from(CustomerProductEntity cp) {
        return new OverduePlanResponse(
                cp.getId(),
                cp.getCustomer().getName(),
                cp.getCustomer().getEmail(),
                cp.getProduct().getName(),
                cp.getProduct().getCurrency(),
                cp.getProduct().getPrice(),
                cp.getEndsAt()
        );
    }
}
