package np.com.abhishekojha.coremonolith.modules.auth.service;

import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UpdateUserRoleRequest;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UserResponse;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantUserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TenantAccessGuard guard;
    @Mock private AuditService auditService;

    @InjectMocks
    private TenantUserService tenantUserService;

    // ── updateRole ───────────────────────────────────────────────────────────

    @Test
    void updateRole_superAdminRole_throws400() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());

        assertThatThrownBy(() -> tenantUserService.updateRole(1L, 2L, new UpdateUserRoleRequest(UserRole.SUPER_ADMIN)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateRole_userNotFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());
        when(userRepository.findByIdAndTenantIdAndDeletedAtIsNull(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantUserService.updateRole(1L, 99L, new UpdateUserRoleRequest(UserRole.TENANT_ADMIN)))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void updateRole_success_changesRole() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());
        UserEntity target = tenantUser();
        when(userRepository.findByIdAndTenantIdAndDeletedAtIsNull(2L, 1L)).thenReturn(Optional.of(target));

        UserResponse response = tenantUserService.updateRole(1L, 2L, new UpdateUserRoleRequest(UserRole.TENANT_ADMIN));

        assertThat(target.getRole()).isEqualTo(UserRole.TENANT_ADMIN);
        assertThat(response.role()).isEqualTo(UserRole.TENANT_ADMIN.name());
    }

    // ── disableUser ──────────────────────────────────────────────────────────

    @Test
    void disableUser_userNotFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());
        when(userRepository.findByIdAndTenantIdAndDeletedAtIsNull(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantUserService.disableUser(1L, 99L))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void disableUser_success_setsDisabledStatus() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());
        UserEntity target = tenantUser();
        when(userRepository.findByIdAndTenantIdAndDeletedAtIsNull(2L, 1L)).thenReturn(Optional.of(target));

        tenantUserService.disableUser(1L, 2L);

        assertThat(target.getStatus()).isEqualTo(UserStatus.DISABLED);
    }

    // ── deleteUser ───────────────────────────────────────────────────────────

    @Test
    void deleteUser_success_softDeletesUser() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(callerUser());
        when(guard.currentUser()).thenReturn(callerUser());
        UserEntity target = tenantUser();
        when(userRepository.findByIdAndTenantIdAndDeletedAtIsNull(2L, 1L)).thenReturn(Optional.of(target));

        tenantUserService.deleteUser(1L, 2L);

        assertThat(target.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(target.getDeletedAt()).isNotNull();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TenantEntity tenant() {
        TenantEntity t = new TenantEntity();
        t.setId(1L);
        t.setName("Test Corp");
        return t;
    }

    private UserEntity callerUser() {
        UserEntity u = new UserEntity();
        u.setId(1L);
        u.setEmail("admin@corp.com");
        u.setRole(UserRole.TENANT_ADMIN);
        u.setStatus(UserStatus.ACTIVE);
        u.setTenant(tenant());
        return u;
    }

    private UserEntity tenantUser() {
        UserEntity u = new UserEntity();
        u.setId(2L);
        u.setEmail("user@corp.com");
        u.setRole(UserRole.TENANT_USER);
        u.setStatus(UserStatus.ACTIVE);
        u.setTenant(tenant());
        return u;
    }
}
