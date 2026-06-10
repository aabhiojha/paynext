package np.com.abhishekojha.coremonolith.modules.tenant.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.audit.service.AuditService;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.AssignPlatformPlanRequest;
import np.com.abhishekojha.coremonolith.modules.platformplan.dto.TenantPlatformPlanResponse;
import np.com.abhishekojha.coremonolith.modules.platformplan.service.TenantPlatformPlanService;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.CreateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.StatusChangeRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.TenantResponse;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.UpdateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TenantSuperAdminService {

    private final TenantRepository tenantRepository;
    private final AuditService auditService;
    private final TenantPlatformPlanService tenantPlatformPlanService;

    public TenantResponse createTenant(CreateTenantRequest req) {
        TenantEntity tenant = new TenantEntity();
        tenant.setName(req.name());
        tenant.setSlug(generateUniqueSlug(req.name()));
        tenant.setCompanyEmail(req.companyEmail());
        tenant.setTimezone(req.timezone());
        tenantRepository.save(tenant);

        auditService.log(AuditAction.TENANT_CREATED, "TENANT", tenant.getId(), null,
                Map.of("name", tenant.getName(), "slug", tenant.getSlug(),
                        "companyEmail", tenant.getCompanyEmail()),
                "Created tenant " + tenant.getName() + " (" + tenant.getCompanyEmail() + ")");
        log.info("Tenant created id={} slug={}", tenant.getId(), tenant.getSlug());

        TenantPlatformPlanResponse activePlan = null;
        if (req.planId() != null) {
            activePlan = tenantPlatformPlanService.assign(tenant.getId(),
                    new AssignPlatformPlanRequest(req.planId(), req.customPlanPrice(), null, null));
        }
        return TenantResponse.from(tenant, activePlan);
    }

    @Transactional(readOnly = true)
    public Page<TenantResponse> listTenants(TenantStatus status, Pageable pageable) {
        Page<TenantEntity> tenants = status != null
                ? tenantRepository.findAllByStatusAndDeletedAtIsNull(status, pageable)
                : tenantRepository.findAllByDeletedAtIsNull(pageable);
        return tenants.map(t -> TenantResponse.from(t,
                tenantPlatformPlanService.findActivePlan(t.getId()).orElse(null)));
    }

    @Transactional(readOnly = true)
    public TenantResponse getTenant(Long id) {
        TenantEntity tenant = findNotDeleted(id);
        return TenantResponse.from(tenant,
                tenantPlatformPlanService.findActivePlan(id).orElse(null));
    }

    public TenantResponse updateTenant(Long id, UpdateTenantRequest req) {
        TenantEntity tenant = findActive(id);
        TenantResponse oldState = TenantResponse.from(tenant);

        if (req.name() != null) tenant.setName(req.name());
        if (req.companyEmail() != null) tenant.setCompanyEmail(req.companyEmail());
        if (req.timezone() != null) tenant.setTimezone(req.timezone());

        TenantResponse newState = TenantResponse.from(tenant,
                tenantPlatformPlanService.findActivePlan(id).orElse(null));
        auditService.log(AuditAction.TENANT_UPDATED, "TENANT", id, oldState, newState,
                "Updated tenant " + tenant.getName());
        return newState;
    }

    public TenantResponse suspend(Long id, StatusChangeRequest req) {
        TenantEntity tenant = findActive(id);
        tenant.setStatus(TenantStatus.SUSPENDED);
        tenant.setSuspensionReason(req.reason());
        auditService.log(AuditAction.TENANT_SUSPENDED, "TENANT", id,
                Map.of("status", "ACTIVE"),
                statusChangePayload("SUSPENDED", req.reason()),
                "Suspended tenant " + tenant.getName());
        log.info("Tenant suspended id={}", id);
        return TenantResponse.from(tenant,
                tenantPlatformPlanService.findActivePlan(id).orElse(null));
    }

    // archival is a permanent non removal state
    public TenantResponse archive(Long id, StatusChangeRequest req) {
        TenantEntity tenant = findNotDeleted(id);
        if (tenant.getStatus() == TenantStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }
        String previousStatus = tenant.getStatus().name();
        tenant.setStatus(TenantStatus.ARCHIVED);
        tenant.setArchivedAt(Instant.now());
        tenant.setArchivalReason(req.reason());
        auditService.log(AuditAction.TENANT_ARCHIVED, "TENANT", id,
                Map.of("status", previousStatus),
                statusChangePayload("ARCHIVED", req.reason()),
                "Archived tenant " + tenant.getName());
        log.info("Tenant archived id={} previousStatus={}", id, previousStatus);
        return TenantResponse.from(tenant,
                tenantPlatformPlanService.findActivePlan(id).orElse(null));
    }

    // should be done after suspension
    public TenantResponse reactivate(Long tenantId) {
        TenantEntity tenant = findSuspended(tenantId);
        String previousStatus = tenant.getStatus().name();
        tenant.setStatus(TenantStatus.ACTIVE);
        auditService.log(AuditAction.TENANT_REACTIVATED, "TENANT", tenant.getId(),
                Map.of("status", previousStatus), Map.of("status", "ACTIVE"),
                "Reactivated tenant " + tenant.getName());
        log.info("Tenant reactivated id={} previousStatus={}", tenant.getId(), previousStatus);
        return TenantResponse.from(tenant,
                tenantPlatformPlanService.findActivePlan(tenantId).orElse(null));
    }

    private TenantEntity findNotDeleted(Long id) {
        return tenantRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + id));
    }

    private TenantEntity findActive(Long id) {
        return tenantRepository.findByIdAndStatusAndDeletedAtIsNull(id, TenantStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION"));
    }

    private TenantEntity findSuspended(Long id) {
        return tenantRepository.findByIdAndStatusAndDeletedAtIsNull(id, TenantStatus.SUSPENDED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION"));
    }

    private Map<String, String> statusChangePayload(String status, String reason) {
        Map<String, String> payload = new HashMap<>();
        payload.put("status", status);
        if (reason != null) {
            payload.put("reason", reason);
        }
        return payload;
    }

    private String generateUniqueSlug(String name) {
        String base = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "")
                .substring(0, Math.min(name.length(), 50));

        if (!tenantRepository.existsBySlug(base)) return base;

        int suffix = 2;
        String candidate;
        do {
            String suffixStr = "-" + suffix++;
            int maxBase = 50 - suffixStr.length();
            candidate = base.substring(0, Math.min(base.length(), maxBase)) + suffixStr;
        } while (tenantRepository.existsBySlug(candidate));
        return candidate;
    }

}
