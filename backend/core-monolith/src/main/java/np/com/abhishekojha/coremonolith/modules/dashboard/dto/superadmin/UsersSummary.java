package np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@Schema(description = "Platform-wide user counts")
public class UsersSummary {
    @Schema(description = "All non-deleted users across every tenant", example = "184")
    private long totalUsers;

    @Schema(description = "Users with ACTIVE status and not deleted", example = "150")
    private long activeUsers;
}
