package np.com.abhishekojha.coremonolith.modules.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record RevenueByCurrencyResponse(List<CurrencyTotal> totals) {

    public record CurrencyTotal(String currency, BigDecimal totalAmount, long planCount) {}
}
