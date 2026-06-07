package np.com.abhishekojha.coremonolith.modules.tenant.dto;

import jakarta.validation.constraints.Size;

public record StatusChangeRequest(
        @Size(max = 500)
        String reason
) {}
