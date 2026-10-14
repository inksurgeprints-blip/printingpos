// Expenses / OPEX helpers.
//
// Pure functions (no React, no database) so the rules can be tested on their own.
// - Money is handled in whole centavos (integers) so totals never drift (e.g. 0.1 + 0.2).
// - An expense has a plain calendar date ('YYYY-MM-DD', no time, no timezone), so it always
//   belongs to exactly one day and cannot slip into a neighbouring period.
// - An expense is its OWN record. It is never a sale and never touches an order.

export const CUSTOM_CATEGORY = '__custom__';          // the "Other / custom category" choice in the form
export const WEEK_STARTS_ON = 1;                        // 0 = Sunday, 1 = Monday

export const EXPENSE_CATEGORIES = [
  { name: 'Inventory & Supplies', suggestions: ['Bond paper', 'Photo paper', 'Ink', 'Stickers', 'Laminating film', 'Sticker paper', 'Sintra board'] },
  { name: 'Maintenance',          suggestions: ['Printer repair', 'Equipment servicing', 'Replacement parts'] },
  { name: 'Operating Expenses',   suggestions: ['Rent', 'Electricity', 'Water', 'Internet'] },
  { name: 'Other Expenses',       suggestions: [] },
];
export const DEFAULT_CATEGORY_NAMES = EXPENSE_CATEGORIES.map((c) => c.name);

const MAX_AMOUNT = 1000000000;

// ---------------------------------------------------------------- dates (calendar keys)
const pad2 = (n) => String(n).padStart(2, '0');
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

export function isValidDateKey(key) {
  const m = KEY_RE.exec(String(key || ''));
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// The LOCAL calendar date of a moment, as a key
export function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
export const todayKey = (now = new Date()) => dateKeyFromDate(now);

const toUtcMs = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUtcMs = (ms) => { const dt = new Date(ms); return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`; };

export const addDays = (key, n) => fromUtcMs(toUtcMs(key) + n * DAY_MS);        // UTC maths: daylight-saving can't shift a date
export function weekStart(key, startsOn = WEEK_STARTS_ON) {
  const dow = new Date(toUtcMs(key)).getUTCDay();
  return addDays(key, -((dow - startsOn + 7) % 7));
}
export const weekEnd = (key, startsOn = WEEK_STARTS_ON) => addDays(weekStart(key, startsOn), 6);
export const monthStart = (key) => `${key.slice(0, 8)}01`;
export function monthEnd(key) {
  const y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7));
  return `${key.slice(0, 8)}${pad2(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}
export const yearStart = (key) => `${key.slice(0, 4)}-01-01`;
export const yearEnd = (key) => `${key.slice(0, 4)}-12-31`;

// 'YYYY-MM-DD' strings sort the same way dates do, so plain comparison is enough
export const inRange = (key, from, to) => (!from || key >= from) && (!to || key <= to);

export function periodsFor(nowKey) {
  const y = addDays(nowKey, -1);
  return {
    today: [nowKey, nowKey],
    yesterday: [y, y],
    week: [weekStart(nowKey), weekEnd(nowKey)],
    month: [monthStart(nowKey), monthEnd(nowKey)],
    year: [yearStart(nowKey), yearEnd(nowKey)],
  };
}

// 'Oct 12, 2026' (built from the key, so the day can never shift with the timezone)
export function formatDateKey(key) {
  if (!isValidDateKey(key)) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------- money
const toCents = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
export const expenseCents = (e) => toCents(e && e.amount);

// An expense must be counted once, even if the same record somehow appears twice in a list
export function dedupeById(list) {
  const seen = new Set(); const out = [];
  for (const e of list || []) {
    if (!e) continue;
    if (e.id !== undefined && e.id !== null) { if (seen.has(e.id)) continue; seen.add(e.id); }
    out.push(e);
  }
  return out;
}
export const totalCents = (list) => dedupeById(list).reduce((s, e) => s + expenseCents(e), 0);

// Today / yesterday / this week / this month / this year, in centavos
export function summarizeExpenses(list, nowKey) {
  const uniq = dedupeById(list).filter((e) => isValidDateKey(e.date));
  const out = {};
  for (const [name, [from, to]] of Object.entries(periodsFor(nowKey))) {
    out[name] = uniq.filter((e) => inRange(e.date, from, to)).reduce((s, e) => s + expenseCents(e), 0);
  }
  return out;
}

// Net Profit = Total Sales - Total Expenses, for the selected period (from/to empty = all time)
export function profitSummary({ salesCents = 0, expenses = [], from = '', to = '' }) {
  const inPeriod = dedupeById(expenses).filter((e) => (!from && !to) || (isValidDateKey(e.date) && inRange(e.date, from, to)));
  const expensesCents = inPeriod.reduce((s, e) => s + expenseCents(e), 0);
  return { salesCents, expensesCents, netCents: salesCents - expensesCents, expenseCount: inPeriod.length };
}

// ---------------------------------------------------------------- categories
export function customCategories(expenses) {
  const set = new Map();
  for (const e of dedupeById(expenses)) {
    const c = String((e && e.category) || '').trim();
    if (c && !DEFAULT_CATEGORY_NAMES.some((d) => d.toLowerCase() === c.toLowerCase()) && !set.has(c.toLowerCase())) set.set(c.toLowerCase(), c);
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}
export const allCategoryNames = (expenses) => [...DEFAULT_CATEGORY_NAMES, ...customCategories(expenses)];

// Re-use the spelling that already exists ("packaging" -> "Packaging") so one category never splits in two
export function canonicalCategory(name, known = []) {
  const n = String(name || '').trim().replace(/\s+/g, ' ');
  const hit = [...DEFAULT_CATEGORY_NAMES, ...known].find((k) => k.toLowerCase() === n.toLowerCase());
  return hit || n;
}
export const suggestionsFor = (categoryName) => (EXPENSE_CATEGORIES.find((c) => c.name === categoryName) || { suggestions: [] }).suggestions;

// ---------------------------------------------------------------- the form
export function blankExpenseForm({ now = new Date(), paymentMethodId = '' } = {}) {
  return { date: todayKey(now), category: DEFAULT_CATEGORY_NAMES[0], customCategory: '', description: '', quantity: '', amount: '', paymentMethodId, paymentMethodName: '', notes: '' };
}

// Every field filled from the expense's latest saved values
export function formFromExpense(e, { now = new Date() } = {}) {
  const x = e || {};
  return {
    date: isValidDateKey(x.date) ? x.date : todayKey(now),
    category: x.category ? String(x.category) : DEFAULT_CATEGORY_NAMES[0],
    customCategory: '',
    description: x.description ? String(x.description) : '',
    quantity: x.quantity === undefined || x.quantity === null || x.quantity === '' ? '' : String(x.quantity),
    amount: x.amount === undefined || x.amount === null ? '' : String(x.amount),
    paymentMethodId: x.paymentMethodId ? String(x.paymentMethodId) : '',
    paymentMethodName: x.paymentMethodName ? String(x.paymentMethodName) : '',
    notes: x.notes ? String(x.notes) : '',
  };
}

export function validateExpenseForm(form, ctx = {}) {
  const f = form || {};
  const known = ctx.knownCategories || [];

  const date = String(f.date || '').trim();
  if (!isValidDateKey(date)) return { ok: false, error: 'Please choose a valid date.' };

  let category = String(f.category || '').trim();
  if (category === CUSTOM_CATEGORY) {
    const custom = String(f.customCategory || '').trim().replace(/\s+/g, ' ');
    if (!custom) return { ok: false, error: 'Please enter the category name.' };
    if (custom.length > 40) return { ok: false, error: 'The category name is too long (40 characters at most).' };
    category = canonicalCategory(custom, known);
  } else if (!category) {
    return { ok: false, error: 'Please choose a category.' };
  }

  const description = String(f.description || '').trim();
  if (!description) return { ok: false, error: 'Please enter a description or item name.' };
  if (description.length > 80) return { ok: false, error: 'The description is too long (80 characters at most).' };

  const qText = String(f.quantity ?? '').trim();
  let quantity = null;
  if (qText !== '') {
    quantity = Number(qText);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_AMOUNT) return { ok: false, error: 'Quantity must be a number above 0, or leave it empty.' };
  }

  const aText = String(f.amount ?? '').trim();
  const amount = aText === '' ? NaN : Number(aText);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Please enter an amount above ₱0.' };
  if (amount > MAX_AMOUNT) return { ok: false, error: 'That amount is too large.' };

  const paymentMethodId = String(f.paymentMethodId || '').trim();
  if (!paymentMethodId) return { ok: false, error: 'Please choose a payment method.' };
  const pm = (ctx.paymentMethods || []).find((m) => m.id === paymentMethodId);

  const notes = String(f.notes || '').trim();
  if (notes.length > 300) return { ok: false, error: 'The notes are too long (300 characters at most).' };

  return {
    ok: true,
    values: {
      date,
      category,
      description,
      quantity,
      amount: Math.round(amount * 100) / 100,
      paymentMethodId,
      paymentMethodName: pm ? pm.name : String(f.paymentMethodName || ''),   // name kept with the record, so it still reads right if the method is removed later
      notes,
    },
  };
}

export function buildNewExpense(form, ctx = {}, now = Date.now()) {
  const v = validateExpenseForm(form, ctx);
  if (!v.ok) return v;
  return { ok: true, expense: { ...v.values, createdAt: now, updatedAt: now } };
}
// Editing rewrites the editable fields only; the original createdAt is kept
export function buildExpenseUpdate(form, ctx = {}, now = Date.now()) {
  const v = validateExpenseForm(form, ctx);
  if (!v.ok) return v;
  return { ok: true, changes: { ...v.values, updatedAt: now } };
}

// ---------------------------------------------------------------- list: search / filter / sort
// Newest expense date first; for the same date, the most recently recorded first
export function sortExpenses(list) {
  return [...list].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) ||
    (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0) ||
    String(b.id || '').localeCompare(String(a.id || '')));
}

export function filterExpenses(list, { search = '', from = '', to = '', category = 'all', paymentLabel = (e) => e.paymentMethodName || '' } = {}) {
  const q = String(search || '').trim().toLowerCase();
  return dedupeById(list).filter((e) => {
    if (category && category !== 'all' && String(e.category || '').toLowerCase() !== String(category).toLowerCase()) return false;
    if ((from || to) && !(isValidDateKey(e.date) && inRange(e.date, from, to))) return false;
    if (q) {
      const hay = [e.description, e.category, e.notes, paymentLabel(e), (Number(e.amount) || 0).toFixed(2), e.quantity].map((v) => String(v ?? '').toLowerCase()).join(' | ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
