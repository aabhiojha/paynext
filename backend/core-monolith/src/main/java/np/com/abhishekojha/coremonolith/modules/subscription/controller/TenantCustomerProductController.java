package np.com.abhishekojha.coremonolith.modules.subscription.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.SubscriptionStatus;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.SubscriptionResponse;
import np.com.abhishekojha.coremonolith.modules.subscription.service.CustomerProductService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/customer-products")
@RequiredArgsConstructor
@Tag(name = "Customer Products", description = "Customer plan (product assignment) management")
@SecurityRequirement(name = "bearerAuth")
public class TenantCustomerProductController {

    private final CustomerProductService customerProductService;

    @Operation(summary = "List all plans tenant-wide", description = "Optionally filter by status.")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Page<SubscriptionResponse>> listAll(
            @PathVariable Long tenantId,
            @RequestParam(required = false) SubscriptionStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(customerProductService.listByTenant(tenantId, status, search, pageable));
    }
}
