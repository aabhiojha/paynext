package np.com.abhishekojha.coremonolith.modules.tenant.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteAdminRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.service.InvitationService;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.CreateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.TenantResponse;
import np.com.abhishekojha.coremonolith.modules.tenant.dto.UpdateTenantRequest;
import np.com.abhishekojha.coremonolith.modules.tenant.service.TenantSuperAdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Tenants", description = "Tenant lifecycle management (Super Admin only)")
@SecurityRequirement(name = "bearerAuth")
public class TenantController {

    private final TenantSuperAdminService tenantSuperAdminService;
    private final InvitationService invitationService;

    @Operation(summary = "Create tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Tenant created"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody CreateTenantRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantSuperAdminService.createTenant(req));
    }

    @Operation(summary = "List tenants", description = "Paginated list, optionally filtered by status")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    public ResponseEntity<Page<TenantResponse>> listTenants(
            @Parameter(description = "Filter by tenant status") @RequestParam(required = false) TenantStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(tenantSuperAdminService.listTenants(status, pageable));
    }

    @Operation(summary = "Get tenant by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK"),
            @ApiResponse(responseCode = "404", description = "Tenant not found")
    })
    @GetMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> getTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.getTenant(tenantId));
    }

    @Operation(summary = "Update tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Updated"),
            @ApiResponse(responseCode = "404", description = "Tenant not found")
    })
    @PatchMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> updateTenant(
            @PathVariable Long tenantId,
            @Valid @RequestBody UpdateTenantRequest req) {
        return ResponseEntity.ok(tenantSuperAdminService.updateTenant(tenantId, req));
    }

    @Operation(summary = "Suspend tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Suspended"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition"),
            @ApiResponse(responseCode = "404", description = "Tenant not found")
    })
    @PostMapping("/{tenantId}/suspend")
    public ResponseEntity<TenantResponse> suspendTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.suspend(tenantId));
    }

    @Operation(summary = "Archive tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Archived"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition"),
            @ApiResponse(responseCode = "404", description = "Tenant not found")
    })
    @PostMapping("/{tenantId}/archive")
    public ResponseEntity<TenantResponse> archiveTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(tenantSuperAdminService.archive(tenantId));
    }

    @Operation(summary = "Invite tenant admin", description = "Send an invitation email to the first admin of a tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Invitation created and email dispatched"),
            @ApiResponse(responseCode = "400", description = "Tenant not ACTIVE"),
            @ApiResponse(responseCode = "404", description = "Tenant not found"),
            @ApiResponse(responseCode = "409", description = "Pending invitation already exists for this email")
    })
    @PostMapping("/{tenantId}/invite-admin")
    public ResponseEntity<InvitationResponse> inviteAdmin(
            @PathVariable Long tenantId,
            @Valid @RequestBody InviteAdminRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invitationService.inviteAdmin(tenantId, req));
    }
}
