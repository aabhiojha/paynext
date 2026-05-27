package np.com.abhishekojha.coremonolith.modules.audit.repository;

import np.com.abhishekojha.coremonolith.common.enums.AuditAction;
import np.com.abhishekojha.coremonolith.modules.audit.model.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query(value = """
            SELECT a.* FROM audit_logs a
            WHERE (:actorId IS NULL OR a.actor_id = :actorId)
              AND (CAST(:action AS audit_action) IS NULL OR a.action = CAST(:action AS audit_action))
              AND (:resourceType IS NULL OR a.resource_type = :resourceType)
              AND (:resourceId IS NULL OR a.resource_id = :resourceId)
            ORDER BY a.created_at DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM audit_logs a
            WHERE (:actorId IS NULL OR a.actor_id = :actorId)
              AND (CAST(:action AS audit_action) IS NULL OR a.action = CAST(:action AS audit_action))
              AND (:resourceType IS NULL OR a.resource_type = :resourceType)
              AND (:resourceId IS NULL OR a.resource_id = :resourceId)
            """,
            nativeQuery = true)
    Page<AuditLogEntity> findFiltered(
            @Param("actorId") Long actorId,
            @Param("action") String action,
            @Param("resourceType") String resourceType,
            @Param("resourceId") Long resourceId,
            Pageable pageable
    );

    @Query("""
            SELECT a FROM AuditLogEntity a
            WHERE a.actor.tenant.id = :tenantId
            ORDER BY a.createdAt DESC
            """)
    List<AuditLogEntity> findTop10ByTenantId(@Param("tenantId") Long tenantId, Pageable pageable);
}
