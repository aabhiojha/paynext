package np.com.abhishekojha.coremonolith.modules.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import np.com.abhishekojha.coremonolith.common.enums.BillingCadence;
import np.com.abhishekojha.coremonolith.common.enums.ProductStatus;

import java.math.BigDecimal;

public record UpdateProductRequest(

        @Size(max = 200)
        String name,

        String description,

        @DecimalMin(value = "0.0001", message = "Price must be greater than zero")
        BigDecimal price,

        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO code")
        String currency,

        BillingCadence billingCadence,

        ProductStatus status
) {}
