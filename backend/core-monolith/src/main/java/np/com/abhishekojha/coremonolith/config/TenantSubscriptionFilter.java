package np.com.abhishekojha.coremonolith.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import np.com.abhishekojha.coremonolith.common.enums.TenantStatus;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import np.com.abhishekojha.coremonolith.modules.tenant.repository.TenantRepository;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class TenantSubscriptionFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Not authenticated yet — let Spring Security handle it downstream
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);

        // Unknown user or SUPER_ADMIN — not bound to a tenant
        if (user == null || user.getRole() == UserRole.SUPER_ADMIN) {
            if (user != null) {
                MDC.put("userId", String.valueOf(user.getId()));
                MDC.put("role", user.getRole().name());
            }
            filterChain.doFilter(request, response);
            return;
        }

        // Enrich MDC so every log line in this request carries user/tenant context
        MDC.put("userId", String.valueOf(user.getId()));
        MDC.put("role", user.getRole().name());

        if (user.getTenant() == null) {
            reject(response, "TENANT_NOT_FOUND", "No tenant associated with this account.");
            return;
        }

        Long tenantId = user.getTenant().getId();
        MDC.put("tenantId", String.valueOf(tenantId));
        TenantEntity tenant = tenantRepository.findByIdAndDeletedAtIsNull(tenantId).orElse(null);

        if (tenant == null) {
            reject(response, "TENANT_NOT_FOUND", "Tenant account not found.");
            return;
        }

        if (tenant.getStatus() == TenantStatus.SUSPENDED) {
            log.warn("Blocked request from suspended tenant={} user={}", tenantId, email);
            reject(response, "ACCOUNT_SUSPENDED", "Your account has been suspended. Please contact support.");
            return;
        }

        if (tenant.getStatus() == TenantStatus.ARCHIVED) {
            log.warn("Blocked request from archived tenant={} user={}", tenantId, email);
            reject(response, "ACCOUNT_ARCHIVED", "This account is no longer active.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String code, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "code", code,
                "message", message
        )));
    }
}
