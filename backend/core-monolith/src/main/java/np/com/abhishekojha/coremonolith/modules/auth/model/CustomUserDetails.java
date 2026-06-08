package np.com.abhishekojha.coremonolith.modules.auth.model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

public class CustomUserDetails extends User {

    private final Long userId;

    public CustomUserDetails(Long userId, String email, String password,
                              Collection<? extends GrantedAuthority> authorities) {
        super(email, password, authorities);
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}
