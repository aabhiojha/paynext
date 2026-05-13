package np.com.abhishekojha.notificationservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sendgrid")
@Getter
@Setter
public class EmailProperties {
    private String apiKey;
    private String fromEmail;
    private String fromName;
}
