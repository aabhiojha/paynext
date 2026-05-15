package np.com.abhishekojha.coremonolith.modules.customerproduct.dto;

import jakarta.validation.constraints.NotNull;
import np.com.abhishekojha.coremonolith.common.enums.CustomerProductStatus;

public record UpdateCustomerProductStatusRequest(
        @NotNull
        CustomerProductStatus status
) {}
