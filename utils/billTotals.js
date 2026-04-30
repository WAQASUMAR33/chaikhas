/** Dine In: 5% service charge on full bill amount (before discount); discount reduces bill; net = bill − discount + service. */

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
    // Service charge on bill amount before discount (not on discounted gross)
    const serviceCharge = amt * (DINE_IN_SERVICE_CHARGE_PERCENT / 100);
    const grossTotal = amt - discountAmount;
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
