package np.com.abhishekojha.notificationservice.dto;

public enum InvitationRole {
    TENANT_ADMIN,
    TENANT_USER;

    public String display() {
        return switch (this) {
            case TENANT_ADMIN -> "Admin";
            case TENANT_USER  -> "User";
        };
    }
}
