package np.com.abhishekojha.coremonolith.modules.dashboard.dto;

import java.time.LocalDate;

public record ReminderStatsResponse(
        LocalDate from,
        LocalDate to,
        long sent,
        long failed,
        long skipped,
        long total
) {}
