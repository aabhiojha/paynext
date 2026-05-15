package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import java.time.Instant;

public record UpdateCustomerProductRequest(
        Instant startsAt,
        Instant endsAt,
        String notes
) {}
