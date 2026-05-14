package np.com.abhishekojha.coremonolith.modules.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.config.TenantAccessGuard;
import np.com.abhishekojha.coremonolith.modules.auth.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "Identity", description = "Current user profile")
@SecurityRequirement(name = "bearerAuth")
public class MeController {

    private final TenantAccessGuard guard;

    @Operation(summary = "Get own profile")
    @ApiResponse(responseCode = "200", description = "OK")
    @GetMapping
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(UserResponse.from(guard.currentUser()));
    }
}
