package np.com.abhishekojha.notificationservice.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
public class InviteEmailRequest {
    private Long tenantId;
    private String tenantName;
    private String recipientEmail;
    private InvitationRole role;
    private String inviteToken;
    private Instant expiresAt;
}
