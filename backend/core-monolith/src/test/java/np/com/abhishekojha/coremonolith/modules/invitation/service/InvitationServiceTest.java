package np.com.abhishekojha.coremonolith.modules.invitation.service;

import np.com.abhishekojha.coremonolith.common.enums.InvitationRole;
import np.com.abhishekojha.coremonolith.common.enums.InvitationStatus;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.model.UserInvitationEntity;
import np.com.abhishekojha.coremonolith.modules.invitation.repository.InvitationRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock private InvitationRepository invitationRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private NotificationClient notificationClient;
    @Mock private TenantAccessGuard guard;
    @Mock private AuditService auditService;

    @InjectMocks
    private InvitationService invitationService;

    // ── inviteAdmin ──────────────────────────────────────────────────────────

    @Test
    void inviteAdmin_tenantNotFound_throwsEntityNotFound() {
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invitationService.inviteAdmin(1L, new InviteRequest("a@b.com")))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void inviteAdmin_tenantNotActive_throws400() {
        TenantEntity tenant = tenant();
        tenant.setStatus(TenantStatus.SUSPENDED);
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant));

        assertThatThrownBy(() -> invitationService.inviteAdmin(1L, new InviteRequest("a@b.com")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void inviteAdmin_alreadyPending_throws409() {
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(invitationRepository.existsByTenantIdAndEmailAndStatus(1L, "a@b.com", InvitationStatus.PENDING))
                .thenReturn(true);

        assertThatThrownBy(() -> invitationService.inviteAdmin(1L, new InviteRequest("a@b.com")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void inviteAdmin_success_savesAndDispatchesAdminNotification() {
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(invitationRepository.existsByTenantIdAndEmailAndStatus(anyLong(), anyString(), any())).thenReturn(false);
        when(guard.currentUser()).thenReturn(staffUser());
        when(invitationRepository.save(any())).thenAnswer(inv -> {
            UserInvitationEntity entity = inv.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        InvitationResponse response = invitationService.inviteAdmin(1L, new InviteRequest("a@b.com"));

        assertThat(response.email()).isEqualTo("a@b.com");
        assertThat(response.role()).isEqualTo(InvitationRole.TENANT_ADMIN.name());
        verify(notificationClient).sendAdminInvitation(any());
    }

    // ── inviteUser ───────────────────────────────────────────────────────────

    @Test
    void inviteUser_alreadyPending_throws409() {
        when(guard.requireTenantAccess(1L)).thenReturn(staffUser());
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(invitationRepository.existsByTenantIdAndEmailAndStatus(1L, "a@b.com", InvitationStatus.PENDING))
                .thenReturn(true);

        assertThatThrownBy(() -> invitationService.inviteUser(1L, new InviteRequest("a@b.com")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void inviteUser_success_savesAndDispatchesUserNotification() {
        when(guard.requireTenantAccess(1L)).thenReturn(staffUser());
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(invitationRepository.existsByTenantIdAndEmailAndStatus(anyLong(), anyString(), any())).thenReturn(false);
        when(guard.currentUser()).thenReturn(staffUser());
        when(invitationRepository.save(any())).thenAnswer(inv -> {
            UserInvitationEntity entity = inv.getArgument(0);
            entity.setId(100L);
            return entity;
        });

        InvitationResponse response = invitationService.inviteUser(1L, new InviteRequest("u@b.com"));

        assertThat(response.role()).isEqualTo(InvitationRole.TENANT_USER.name());
        verify(notificationClient).sendInvitation(any());
    }

    // ── revokeInvitation ─────────────────────────────────────────────────────

    @Test
    void revokeInvitation_notFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(invitationRepository.findByIdAndTenantId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invitationService.revokeInvitation(1L, 5L))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void revokeInvitation_alreadyRevoked_throws400() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        UserInvitationEntity inv = pendingInvitation();
        inv.setStatus(InvitationStatus.REVOKED);
        when(invitationRepository.findByIdAndTenantId(5L, 1L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> invitationService.revokeInvitation(1L, 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void revokeInvitation_success_setsRevokedStatus() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        UserInvitationEntity inv = pendingInvitation();
        when(invitationRepository.findByIdAndTenantId(5L, 1L)).thenReturn(Optional.of(inv));

        invitationService.revokeInvitation(1L, 5L);

        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    // ── resendInvitation ─────────────────────────────────────────────────────

    @Test
    void resendInvitation_notPending_throws400() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        UserInvitationEntity inv = pendingInvitation();
        inv.setStatus(InvitationStatus.ACCEPTED);
        when(invitationRepository.findByIdAndTenantId(eq(5L), anyLong())).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> invitationService.resendInvitation(1L, 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void resendInvitation_success_updatesTokenAndNotifies() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        UserInvitationEntity inv = pendingInvitation();
        String originalHash = inv.getTokenHash();
        when(invitationRepository.findByIdAndTenantId(eq(5L), anyLong())).thenReturn(Optional.of(inv));

        invitationService.resendInvitation(1L, 5L);

        assertThat(inv.getTokenHash()).isNotEqualTo(originalHash);
        assertThat(inv.getExpiresAt()).isAfter(Instant.now());
        verify(notificationClient).sendInvitation(any());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TenantEntity tenant() {
        TenantEntity t = new TenantEntity();
        t.setId(1L);
        t.setName("Test Corp");
        t.setStatus(TenantStatus.ACTIVE);
        return t;
    }

    private UserEntity staffUser() {
        UserEntity u = new UserEntity();
        u.setId(2L);
        u.setEmail("admin@corp.com");
        u.setRole(UserRole.TENANT_ADMIN);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    private UserInvitationEntity pendingInvitation() {
        UserInvitationEntity inv = new UserInvitationEntity();
        inv.setId(5L);
        inv.setEmail("invite@example.com");
        inv.setRole(InvitationRole.TENANT_USER);
        inv.setTenant(tenant());
        inv.setStatus(InvitationStatus.PENDING);
        inv.setTokenHash("original-hash");
        inv.setExpiresAt(Instant.now().plusSeconds(86400));
        inv.setCreatedAt(Instant.now());
        return inv;
    }
}
