// Receipt maths for a saved order.
//
// Pure functions with no React in them, so they can be tested on their own.
// All money is handled in whole centavos (integers) so sums never drift
// (e.g. 0.1 + 0.2), then formatted to pesos only for display.
//
// How orders are saved (see handleCheckout in App.jsx):
//   subtotal         = sum of (unit price x qty) for every item, where the unit price
//                      ALREADY includes the Long Size Paper fee when that option is on
//   longSizeCharge   = informational only: the long-size part that is already INSIDE subtotal
//   additionalCharge = the manual charge only
//   total            = subtotal + additionalCharge
//
// Older orders were saved differently: subtotal held base prices only, and the long-size
// fee was bundled INTO additionalCharge. Both shapes are recognised here so a receipt (and
// the Edit screen) never counts the long-size fee twice.

// Per-sheet fee for Long Size Paper. Must match the fee used in the Current Order.
export const LONG_SIZE_FEE = 2.0;
const LONG_SIZE_CATEGORIES = ['cat_doc', 'cat_copy'];

const toCents = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const hasNumber = (v) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

export function formatPeso(cents) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}₱${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function analyzeOrder(order) {
  const o = order || {};
  const items = Array.isArray(o.items) ? o.items : [];
  const feeCents = toCents(LONG_SIZE_FEE);

  const lines = items.map((it) => {
    const q = Number(it.qty);
    const qty = Number.isFinite(q) && q > 0 ? q : 1;
    const baseCents = toCents(it.price);
    const longSize = LONG_SIZE_CATEGORIES.includes(it.categoryId) && !!it.isLongSize;
    const unitCents = baseCents + (longSize ? feeCents : 0);   // updated unit price, fee included
    return {
      name: String(it.name || 'Item').replace(/\s*\n\s*/g, ' ').trim(),
      qty,
      baseCents,
      unitCents,
      amountCents: unitCents * qty,
      longSize,
    };
  });

  const withLong = lines.reduce((s, l) => s + l.amountCents, 0);
  const baseOnly = lines.reduce((s, l) => s + l.baseCents * l.qty, 0);

  const storedSub = hasNumber(o.subtotal) ? toCents(o.subtotal) : null;
  const storedAdd = hasNumber(o.additionalCharge) ? Math.max(0, toCents(o.additionalCharge)) : 0;
  const storedLong = hasNumber(o.longSizeCharge) ? toCents(o.longSizeCharge) : 0;
  const storedTotal = hasNumber(o.total) ? toCents(o.total) : null;

  let itemized, subtotalCents, extraCents;
  if (storedSub === null || storedSub === withLong) {
    // Current shape: item prices add up to the saved subtotal, additionalCharge is the manual charge only
    itemized = true;
    subtotalCents = withLong;
    extraCents = storedAdd;
  } else if (storedLong > 0 && storedSub === baseOnly && withLong === baseOnly + storedLong && storedAdd >= storedLong) {
    // Older shape: the long-size fee was bundled into additionalCharge. Show it in the unit
    // price (like new orders) and keep only the remainder as the additional charge.
    itemized = true;
    subtotalCents = withLong;
    extraCents = storedAdd - storedLong;
  } else {
    // Item prices can't be reconciled with the saved subtotal (e.g. imported from a CSV).
    // Don't show per-item prices that might be wrong - trust the saved figures instead.
    itemized = false;
    subtotalCents = storedSub;
    extraCents = storedAdd;
  }

  const computedTotal = subtotalCents + extraCents;
  const totalCents = storedTotal === null ? computedTotal : storedTotal;
  const adjustmentCents = totalCents - computedTotal;   // 0 for any consistent order

  return { lines, itemized, subtotalCents, extraCents, totalCents, adjustmentCents };
}

// Everything the receipt needs, ready to print.
export function buildReceipt(order) {
  const a = analyzeOrder(order);
  const note = String((order && order.additionalChargeNote) || '').trim();
  const charges = [];
  if (a.extraCents > 0) charges.push({ label: note || 'Additional Charge', cents: a.extraCents });
  return {
    lines: a.lines,
    itemized: a.itemized,
    subtotalCents: a.subtotalCents,
    charges,
    adjustmentCents: a.adjustmentCents,
    totalCents: a.totalCents,
  };
}

// The manual additional charge of a saved order, in pesos, for loading into the Edit screen.
export function getManualCharge(order) {
  return analyzeOrder(order).extraCents / 100;
}
