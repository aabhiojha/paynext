package np.com.abhishekojha.coremonolith.modules.customer.service;

import np.com.abhishekojha.coremonolith.common.enums.CustomerStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.customer.dto.CreateCustomerRequest;
import np.com.abhishekojha.coremonolith.modules.customer.dto.CustomerResponse;
import np.com.abhishekojha.coremonolith.modules.customer.dto.UpdateCustomerRequest;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import np.com.abhishekojha.coremonolith.modules.customer.repository.CustomerRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private TenantAccessGuard guard;
    @Mock private AuditService auditService;

    @InjectMocks
    private CustomerService customerService;

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    void create_tenantNotFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.create(1L, createReq("a@b.com")))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void create_duplicateEmail_throws409() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(customerRepository.existsByTenantIdAndEmailAndDeletedAtIsNull(1L, "dup@b.com")).thenReturn(true);

        assertThatThrownBy(() -> customerService.create(1L, createReq("dup@b.com")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void create_success_savesAndReturnsCustomer() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(customerRepository.existsByTenantIdAndEmailAndDeletedAtIsNull(1L, "new@b.com")).thenReturn(false);

        CustomerResponse response = customerService.create(1L, createReq("new@b.com"));

        assertThat(response.email()).isEqualTo("new@b.com");
        assertThat(response.name()).isEqualTo("Alice");
        verify(customerRepository).save(any(CustomerEntity.class));
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    void update_customerNotFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.update(1L, 99L, new UpdateCustomerRequest(null, null, null, null, null)))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void update_emailConflict_throws409() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        CustomerEntity existing = customer("old@b.com");
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(1L, 1L)).thenReturn(Optional.of(existing));
        when(customerRepository.existsByTenantIdAndEmailAndDeletedAtIsNull(1L, "taken@b.com")).thenReturn(true);

        assertThatThrownBy(() -> customerService.update(1L, 1L, new UpdateCustomerRequest(null, "taken@b.com", null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void update_sameEmail_noConflictCheck() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        CustomerEntity existing = customer("same@b.com");
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(1L, 1L)).thenReturn(Optional.of(existing));

        CustomerResponse response = customerService.update(1L, 1L, new UpdateCustomerRequest(null, "same@b.com", null, null, null));

        verify(customerRepository, never()).existsByTenantIdAndEmailAndDeletedAtIsNull(anyLong(), anyString());
        assertThat(response.email()).isEqualTo("same@b.com");
    }

    @Test
    void update_nameChange_success() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        CustomerEntity existing = customer("a@b.com");
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(1L, 1L)).thenReturn(Optional.of(existing));

        CustomerResponse response = customerService.update(1L, 1L, new UpdateCustomerRequest("Bob", null, null, null, null));

        assertThat(response.name()).isEqualTo("Bob");
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_customerNotFound_throwsEntityNotFound() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.delete(1L, 99L))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }

    @Test
    void delete_success_softDeletesCustomer() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(staffUser());
        when(guard.currentUser()).thenReturn(staffUser());
        CustomerEntity existing = customer("a@b.com");
        when(customerRepository.findByIdAndTenantIdAndDeletedAtIsNull(1L, 1L)).thenReturn(Optional.of(existing));

        customerService.delete(1L, 1L);

        assertThat(existing.getStatus()).isEqualTo(CustomerStatus.DELETED);
        assertThat(existing.getDeletedAt()).isNotNull();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TenantEntity tenant() {
        TenantEntity t = new TenantEntity();
        t.setId(1L);
        t.setName("Test Corp");
        return t;
    }

    private UserEntity staffUser() {
        UserEntity u = new UserEntity();
        u.setId(2L);
        u.setEmail("staff@corp.com");
        u.setRole(UserRole.TENANT_ADMIN);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    private CustomerEntity customer(String email) {
        CustomerEntity c = new CustomerEntity();
        c.setId(1L);
        c.setTenant(tenant());
        c.setName("Alice");
        c.setEmail(email);
        c.setStatus(CustomerStatus.ACTIVE);
        return c;
    }

    private CreateCustomerRequest createReq(String email) {
        return new CreateCustomerRequest("Alice", email, null, null, null);
    }
}
