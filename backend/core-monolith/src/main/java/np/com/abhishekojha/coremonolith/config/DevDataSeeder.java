package np.com.abhishekojha.coremonolith.config;

import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.common.enums.UserRole;
import np.com.abhishekojha.coremonolith.common.enums.UserStatus;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import np.com.abhishekojha.coremonolith.modules.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private static final String SUPER_ADMIN_EMAIL    = "admin@saas.dev";
    private static final String SUPER_ADMIN_PASSWORD = "Admin@1234";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmail(SUPER_ADMIN_EMAIL)) {
            log.info("Super admin already exists, skipping seed");
            return;
        }

        UserEntity superAdmin = new UserEntity();
        superAdmin.setEmail(SUPER_ADMIN_EMAIL);
        superAdmin.setPasswordHash(passwordEncoder.encode(SUPER_ADMIN_PASSWORD));
        superAdmin.setRole(UserRole.SUPER_ADMIN);
        superAdmin.setStatus(UserStatus.ACTIVE);
        userRepository.save(superAdmin);

        log.info("Seeded SUPER_ADMIN — email: {}  password: {}", SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    }
}
