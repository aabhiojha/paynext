package np.com.abhishekojha.coremonolith.modules.subscription.dto;

import java.time.Instant;

public record UpdateSubscriptionRequest(
        Instant startsAt,
        Instant endsAt,
        String notes
) {}
