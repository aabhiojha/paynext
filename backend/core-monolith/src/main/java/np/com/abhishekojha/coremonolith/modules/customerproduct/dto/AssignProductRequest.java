package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record AssignProductRequest(

        @NotNull
        Long productId,

        Instant startsAt,

        Instant endsAt,

        String notes
) {}
