package np.com.abhishekojha.coremonolith.modules.reminder.service;

import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;
import np.com.abhishekojha.coremonolith.common.enums.CustomerStatus;
import np.com.abhishekojha.coremonolith.common.enums.ReminderStatus;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.customer.model.CustomerEntity;
import np.com.abhishekojha.coremonolith.modules.subscription.model.CustomerProductEntity;
import np.com.abhishekojha.coremonolith.modules.subscription.repository.CustomerProductRepository;
import np.com.abhishekojha.coremonolith.modules.invitation.client.NotificationClient;
import np.com.abhishekojha.coremonolith.modules.product.model.ProductEntity;
import np.com.abhishekojha.coremonolith.modules.reminder.dto.ReminderResponse;
import np.com.abhishekojha.coremonolith.modules.reminder.model.ReminderEntity;
import np.com.abhishekojha.coremonolith.modules.reminder.repository.ReminderRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderServiceTest {

    @Mock private ReminderRepository reminderRepository;
    @Mock private CustomerProductRepository customerProductRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private TenantAccessGuard guard;
    @Mock private NotificationClient notificationClient;

    @InjectMocks
    private ReminderService reminderService;

    // ── trigger ──────────────────────────────────────────────────────────────

    @Test
    void trigger_noDuePlans_returnsEmptyList() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(null);
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(tenant()));
        when(customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                eq(1L), eq(CustomerProductStatus.ACTIVE), any(), any()))
                .thenReturn(List.of());

        List<ReminderResponse> results = reminderService.trigger(1L);

        assertThat(results).isEmpty();
        verify(reminderRepository, times(0)).save(any());
    }

    @Test
    void trigger_duePlan_savesReminderWithSentStatus() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(null);
        TenantEntity t = tenant();
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(t));
        when(customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                eq(1L), eq(CustomerProductStatus.ACTIVE), any(), any()))
                .thenReturn(List.of(duePlan(t)));

        List<ReminderResponse> results = reminderService.trigger(1L);

        ArgumentCaptor<ReminderEntity> captor = ArgumentCaptor.forClass(ReminderEntity.class);
        verify(reminderRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ReminderStatus.SENT);
        assertThat(captor.getValue().getSentAt()).isNotNull();
        assertThat(results).hasSize(1);
        assertThat(results.get(0).status()).isEqualTo(ReminderStatus.SENT.name());
    }

    @Test
    void trigger_dispatchFails_savesReminderWithFailedStatus() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(null);
        TenantEntity t = tenant();
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(t));
        when(customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                eq(1L), eq(CustomerProductStatus.ACTIVE), any(), any()))
                .thenReturn(List.of(duePlan(t)));
        doThrow(new RuntimeException("connection refused")).when(notificationClient).sendReminder(any());

        List<ReminderResponse> results = reminderService.trigger(1L);

        ArgumentCaptor<ReminderEntity> captor = ArgumentCaptor.forClass(ReminderEntity.class);
        verify(reminderRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ReminderStatus.FAILED);
        assertThat(captor.getValue().getErrorMessage()).isEqualTo("connection refused");
        assertThat(results.get(0).status()).isEqualTo(ReminderStatus.FAILED.name());
    }

    @Test
    void trigger_multiplePlans_processesAll() {
        when(guard.requireTenantAccess(anyLong())).thenReturn(null);
        TenantEntity t = tenant();
        when(tenantRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(t));
        when(customerProductRepository.findAllByTenantIdAndStatusAndDeletedAtIsNullAndEndsAtBetween(
                eq(1L), eq(CustomerProductStatus.ACTIVE), any(), any()))
                .thenReturn(List.of(duePlan(t), duePlan(t)));

        List<ReminderResponse> results = reminderService.trigger(1L);

        verify(reminderRepository, times(2)).save(any());
        assertThat(results).hasSize(2);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private TenantEntity tenant() {
        TenantEntity t = new TenantEntity();
        t.setId(1L);
        t.setName("Test Corp");
        return t;
    }

    private CustomerProductEntity duePlan(TenantEntity tenant) {
        CustomerEntity customer = new CustomerEntity();
        customer.setId(10L);
        customer.setName("Bob Smith");
        customer.setEmail("bob@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setTenant(tenant);

        ProductEntity product = new ProductEntity();
        product.setId(20L);
        product.setName("Pro Plan");
        product.setPrice(new BigDecimal("49.99"));
        product.setCurrency("USD");
        product.setTenant(tenant);

        CustomerProductEntity cp = new CustomerProductEntity();
        cp.setId(30L);
        cp.setTenant(tenant);
        cp.setCustomer(customer);
        cp.setProduct(product);
        cp.setStatus(CustomerProductStatus.ACTIVE);
        cp.setStartsAt(Instant.now().minus(30, ChronoUnit.DAYS));
        cp.setEndsAt(Instant.now().plus(3, ChronoUnit.DAYS));
        return cp;
    }
}
