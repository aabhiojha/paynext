package np.com.abhishekojha.coremonolith.modules.reminder.client;

public record ReminderNotificationPayload(
        Long tenantId,
        String tenantName,
        String customerName,
        String customerEmail,
        String productName,
        String amount,
        String dueDate
) {}
