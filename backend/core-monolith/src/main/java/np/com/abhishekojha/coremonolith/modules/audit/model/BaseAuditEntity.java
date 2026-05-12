package np.com.abhishekojha.coremonolith.modules.audit.model;

import java.util.Date;

public abstract class BaseAuditEntity {
    private Date createdAt;
    private Date updatedAt;
    private Date archivedAt;
}
