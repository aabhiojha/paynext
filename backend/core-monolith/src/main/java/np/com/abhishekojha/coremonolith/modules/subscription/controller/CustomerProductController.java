package np.com.abhishekojha.coremonolith.modules.subscription.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.SubscriptionStatus;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.AssignProductRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.SubscriptionResponse;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.UpdateSubscriptionRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.dto.UpdateSubscriptionStatusRequest;
import np.com.abhishekojha.coremonolith.modules.subscription.service.CustomerProductService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/customers/{customerId}/products")
@RequiredArgsConstructor
@Tag(name = "Customer Products", description = "Customer plan (product assignment) management")
@SecurityRequirement(name = "bearerAuth")
public class CustomerProductController {

    private final CustomerProductService customerProductService;

    @Operation(summary = "Assign product to customer")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Plan created"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "404", description = "Customer or product not found")
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<SubscriptionResponse> assign(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @Valid @RequestBody AssignProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerProductService.assign(tenantId, customerId, req));
    }

    @Operation(summary = "List customer products")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Page<SubscriptionResponse>> list(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(customerProductService.listByCustomer(tenantId, customerId, pageable));
    }

    @Operation(summary = "Get customer product by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @GetMapping("/{cpId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<SubscriptionResponse> get(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @PathVariable Long cpId) {
        return ResponseEntity.ok(customerProductService.get(tenantId, customerId, cpId));
    }

    @Operation(summary = "Update customer product")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Updated"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{cpId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<SubscriptionResponse> update(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @PathVariable Long cpId,
            @Valid @RequestBody UpdateSubscriptionRequest req) {
        return ResponseEntity.ok(customerProductService.update(tenantId, customerId, cpId, req));
    }

    @Operation(summary = "Change plan status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{cpId}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<SubscriptionResponse> updateStatus(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @PathVariable Long cpId,
            @Valid @RequestBody UpdateSubscriptionStatusRequest req) {
        return ResponseEntity.ok(customerProductService.updateStatus(tenantId, customerId, cpId, req));
    }

    @Operation(summary = "Delete customer product", description = "Soft delete")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{cpId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Void> delete(
            @PathVariable Long tenantId,
            @PathVariable Long customerId,
            @PathVariable Long cpId) {
        customerProductService.delete(tenantId, customerId, cpId);
        return ResponseEntity.noContent().build();
    }
}
