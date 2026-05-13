package np.com.abhishekojha.notificationservice.config;

import com.sendgrid.SendGrid;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(EmailProperties.class)
public class EmailConfig {

    @Bean
    public SendGrid sendGrid(EmailProperties props) {
        return new SendGrid(props.getApiKey());
    }
}
