package np.com.abhishekojha.coremonolith.modules.dashboard.dto.superadmin;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@Schema(description = "Aggregate reminder delivery stats across all tenants")
public class RemaindersSummary {
    @Schema(description = "Reminders successfully sent", example = "1024")
    private long sent;

    @Schema(description = "Reminders that failed to send", example = "23")
    private long failed;

    @Schema(description = "Reminders skipped (e.g. no active subscription at send time)", example = "45")
    private long skipped;

    @Schema(description = "Reminders not yet processed (sent_at is null)", example = "12")
    private long pending;

    @Schema(description = "Reminders past their expected delivery that are still pending (not yet implemented)", example = "0")
    private long overdue;

    @Schema(description = "Failure rate as a percentage = (failed / (sent + failed + skipped)) × 100", example = "2.1")
    private double failureRate;
}
