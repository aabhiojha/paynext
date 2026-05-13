package np.com.abhishekojha.coremonolith.modules.tenant.repository;

import np.com.abhishekojha.coremonolith.modules.tenant.model.TenantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<TenantEntity, Long> {


    boolean existsBySlug(String slug);
}
