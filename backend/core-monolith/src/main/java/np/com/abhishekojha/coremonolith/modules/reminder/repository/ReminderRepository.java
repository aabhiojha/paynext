package np.com.abhishekojha.coremonolith.modules.reminder.repository;

import np.com.abhishekojha.coremonolith.modules.reminder.model.ReminderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReminderRepository extends JpaRepository<ReminderEntity, Long> {

    Page<ReminderEntity> findAllByTenantId(Long tenantId, Pageable pageable);

    Optional<ReminderEntity> findByIdAndTenantId(Long id, Long tenantId);
}
