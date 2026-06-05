package np.com.abhishekojha.coremonolith.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static net.logstash.logback.argument.StructuredArguments.kv;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class MdcRequestFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String requestId = Optional.ofNullable(request.getHeader(REQUEST_ID_HEADER))
                .filter(h -> !h.isBlank())
                .orElseGet(() -> UUID.randomUUID().toString());

        MDC.put(MDC_REQUEST_ID, requestId);
        MDC.put("requestPath", request.getRequestURI());
        response.setHeader(REQUEST_ID_HEADER, requestId);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            int status = response.getStatus();
            String method = request.getMethod();
            String uri = request.getRequestURI();

            MDC.put("httpMethod", method);
            MDC.put("httpStatus", String.valueOf(status));
            MDC.put("durationMs", String.valueOf(duration));

            if (status >= 500) {
                log.error("{} {} → {} ({}ms)", method, uri, status, duration);
            } else if (status >= 400) {
                log.warn("{} {} → {} ({}ms)", method, uri, status, duration);
            } else if (duration > 2000) {
                log.warn("{} {} → {} ({}ms) [SLOW]", method, uri, status, duration);
            } else {
                log.info("{} {} → {} ({}ms)", method, uri, status, duration);
            }

            MDC.clear();
        }
    }
}
