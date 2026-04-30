/** Dine In: discount on bill amount, then 5% service charge on gross (after discount). */

const DINE_IN_SERVICE_CHARGE_PERCENT = 5;

export function isDineInOrderType(orderType) {
  return String(orderType || '').trim().toLowerCase() === 'dine in';
}

/**
 * @returns {{ billAmount: number, discountAmount: number, grossTotal: number | null, serviceCharge: number, grandTotal: number, isDineIn: boolean }}
 */
export function computeBillBreakdown(orderType, billAmount, discountPercent, manualServiceCharge) {
  const amt = parseFloat(billAmount || 0);
  const pct = parseFloat(discountPercent || 0);
  const manual = parseFloat(manualServiceCharge || 0);

  if (isDineInOrderType(orderType)) {
    const discountAmount = amt * (pct / 100);
    const grossTotal = amt - discountAmount;
    const serviceCharge = grossTotal * (DINE_IN_SERVICE_CHARGE_PERCENT / 100);
    const grandTotal = grossTotal + serviceCharge;
    return {
      billAmount: amt,
      discountAmount,
      grossTotal,
      serviceCharge,
      grandTotal,
      isDineIn: true,
    };
  }

  const discountAmount = (amt + manual) * (pct / 100);
  const grandTotal = amt + manual - discountAmount;
  return {
    billAmount: amt,
    discountAmount,
    grossTotal: null,
    serviceCharge: manual,
    grandTotal,
    isDineIn: false,
  };
}
