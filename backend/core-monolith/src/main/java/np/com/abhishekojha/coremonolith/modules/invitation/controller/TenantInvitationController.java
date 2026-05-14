package np.com.abhishekojha.coremonolith.modules.invitation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InviteRequest;
import np.com.abhishekojha.coremonolith.modules.invitation.dto.InvitationResponse;
import np.com.abhishekojha.coremonolith.modules.invitation.service.InvitationService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}")
@RequiredArgsConstructor
@Tag(name = "Tenant Invitations", description = "Invitation management within a tenant")
@SecurityRequirement(name = "bearerAuth")
public class TenantInvitationController {

    private final InvitationService invitationService;

    @Operation(summary = "Invite a tenant user", description = "Tenant Admin, Super Admin or Tenant User sends an invitation to a new tenant user")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Invitation created"),
            @ApiResponse(responseCode = "400", description = "Tenant not ACTIVE"),
            @ApiResponse(responseCode = "409", description = "Pending invitation already exists for this email")
    })
    @PostMapping("/invite-user")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN', 'TENANT_USER')")
    public ResponseEntity<InvitationResponse> inviteUser(
            @PathVariable Long tenantId,
            @Valid @RequestBody InviteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invitationService.inviteUser(tenantId, req));
    }

    @Operation(summary = "Invite a tenant admin", description = "Only Super Admin sends an invitation to the Tenant Admin")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Invitation created"),
            @ApiResponse(responseCode = "400", description = "Tenant not ACTIVE"),
            @ApiResponse(responseCode = "409", description = "Pending invitation already exists for this email")
    })
    @PostMapping("/invite-admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<InvitationResponse> inviteAdmin(
            @PathVariable Long tenantId,
            @Valid @RequestBody InviteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invitationService.inviteAdmin(tenantId, req));
    }

    @Operation(summary = "List invitations for a tenant")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping("/invitations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Page<InvitationResponse>> listInvitations(
            @PathVariable Long tenantId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(invitationService.listInvitations(tenantId, pageable));
    }

    @Operation(summary = "Revoke an invitation")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Revoked"),
            @ApiResponse(responseCode = "400", description = "Invitation is not PENDING"),
            @ApiResponse(responseCode = "404", description = "Invitation not found")
    })
    @PostMapping("/invitations/{invitationId}/revoke")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<Void> revokeInvitation(
            @PathVariable Long tenantId,
            @PathVariable Long invitationId) {
        invitationService.revokeInvitation(tenantId, invitationId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Resend an invitation", description = "Generates a new token and resends the invitation email")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Invitation resent"),
            @ApiResponse(responseCode = "400", description = "Invitation is not PENDING"),
            @ApiResponse(responseCode = "404", description = "Invitation not found")
    })
    @PostMapping("/invitations/{invitationId}/resend")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')")
    public ResponseEntity<InvitationResponse> resendInvitation(
            @PathVariable Long tenantId,
            @PathVariable Long invitationId) {
        return ResponseEntity.ok(invitationService.resendInvitation(tenantId, invitationId));
    }
}
