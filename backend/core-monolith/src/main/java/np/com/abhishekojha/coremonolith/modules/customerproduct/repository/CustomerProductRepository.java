package np.com.abhishekojha.coremonolith.modules.customerproduct.repository;

import np.com.abhishekojha.coremonolith.modules.customerproduct.model.CustomerProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerProductRepository extends JpaRepository<CustomerProductEntity, Long> {

    Page<CustomerProductEntity> findAllByTenantIdAndCustomerIdAndDeletedAtIsNull(Long tenantId, Long customerId, Pageable pageable);

    Page<CustomerProductEntity> findAllByTenantIdAndDeletedAtIsNull(Long tenantId, Pageable pageable);

    Optional<CustomerProductEntity> findByIdAndTenantIdAndCustomerIdAndDeletedAtIsNull(Long id, Long tenantId, Long customerId);

    Optional<CustomerProductEntity> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}
