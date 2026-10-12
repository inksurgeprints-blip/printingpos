// Helpers for the Add / Edit Service form in Settings.
// Pure functions (no React) so the rules can be tested on their own.

// What a single-line text field can actually show (it drops line breaks)
const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, '');

export function blankProductForm(categories = []) {
  return { name: '', categoryId: (categories[0] && categories[0].id) || '', price: '', unit: 'page', imageUrl: '' };
}

// Every field of the form, filled from the item's latest saved values.
export function formFromProduct(product, categories = []) {
  const p = product || {};
  return {
    name: oneLine(p.name),
    categoryId: p.categoryId || (categories[0] && categories[0].id) || '',
    price: p.price === undefined || p.price === null ? '' : String(p.price),
    unit: p.unit ? String(p.unit) : 'page',
    imageUrl: p.imageUrl ? String(p.imageUrl) : '',
  };
}

export function validateProductForm(form) {
  const f = form || {};
  const name = String(f.name ?? '').trim();
  if (!name) return { ok: false, error: 'Please enter a Service Title.' };

  const priceText = String(f.price ?? '').trim();
  const price = priceText === '' ? NaN : Number(priceText);
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Please enter a valid price (0 or more).' };

  return {
    ok: true,
    values: {
      name,
      price: Math.round(price * 100) / 100,
      categoryId: f.categoryId || '',
      unit: String(f.unit ?? '').trim() || 'page',
      imageUrl: String(f.imageUrl ?? '').trim(),
    },
  };
}

// A brand-new service (same ordering rule the Add form always used).
export function buildNewProduct(form, products = []) {
  const v = validateProductForm(form);
  if (!v.ok) return v;
  return { ok: true, product: { ...v.values, order: products.length + 1 } };
}

// Saving an EXISTING service: returns only the fields the user actually changed.
//  - untouched fields are never rewritten, so a change made elsewhere in the meantime is not overwritten
//  - `order` is never rewritten (a drag-reorder done while the form was open is kept)...
//  - ...except when the service is moved to another category, where it goes to the end of that category
export function buildProductChanges(base, form, products = [], categories = []) {
  const v = validateProductForm(form);
  if (!v.ok) return v;

  const before = formFromProduct(base, categories);
  const changes = {};
  if (v.values.name !== before.name.trim()) changes.name = v.values.name;
  if (before.price === '' || v.values.price !== Number(before.price)) changes.price = v.values.price;
  if (v.values.unit !== (before.unit.trim() || 'page')) changes.unit = v.values.unit;
  if (v.values.imageUrl !== before.imageUrl.trim()) changes.imageUrl = v.values.imageUrl;
  if (v.values.categoryId !== before.categoryId) {
    changes.categoryId = v.values.categoryId;
    const inTarget = products.filter((p) => p.categoryId === v.values.categoryId && p.id !== (base && base.id));
    changes.order = inTarget.reduce((mx, p) => Math.max(mx, Number(p.order) || 0), 0) + 1;
  }
  return { ok: true, changes, isEmpty: Object.keys(changes).length === 0 };
}
