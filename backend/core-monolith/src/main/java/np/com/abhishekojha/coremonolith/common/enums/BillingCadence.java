package np.com.abhishekojha.coremonolith.common.enums;

import java.time.LocalDate;
import java.time.Period;

public enum BillingCadence {
    WEEKLY(Period.ofWeeks(1)),
    FORTNIGHT(Period.ofWeeks(2)),
    MONTHLY(Period.ofMonths(1)),
    QUARTERLY(Period.ofMonths(3)),
    SEMIANNUALLY(Period.ofMonths(6)),
    ANNUALLY(Period.ofYears(1));

    private final Period period;

    BillingCadence(Period period) {
        this.period = period;
    }

    public LocalDate nextBillingDate(LocalDate from) {
        return from.plus(period);
    }

}
