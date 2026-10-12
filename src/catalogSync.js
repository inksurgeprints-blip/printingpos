// One-time catalog update for a shop that already has products saved in the database.
//
// The app only loads its built-in catalog into an EMPTY database, so changing the built-in
// list alone would never reach a live shop. This brings an existing shop up to date WITHOUT
// wiping anything:
//   - updates the picture (imageUrl) of existing services to the ones in the built-in catalog
//   - adds the services listed in `newIds` if the shop doesn't already have them, placing each
//     one right after the service that precedes it in the catalog
// It never touches prices, names, categories or the shop's own ordering (apart from shifting
// later items down to make room), and it never re-creates a service the shop deleted.
// A version number saved in the database makes sure it runs once, so pictures changed
// later in Settings are not overwritten again.

export const CATALOG_VERSION = 4;
export const CATALOG_NEW_ITEM_IDS = ['p50', 'p51', 'p52'];

// What each release of the catalog changed. A shop only receives the releases that are NEWER than
// the version saved in its database, so a later release never overwrites pictures that were changed
// in Settings after an earlier one. (A shop that has never been updated receives all of them.)
export const CATALOG_RELEASES = [
  { version: 2, allImages: true, newIds: CATALOG_NEW_ITEM_IDS },                       // new Excel: all pictures + 3 new items
  { version: 3, imageIds: ['p1', 'p2', 'p4', 'p5', 'p43', 'p47'] },                    // six pictures replaced
  { version: 4, imageIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p50', 'p51', 'p52', 'p20', 'p21', 'p22', 'p23', 'p24', 'p25', 'p26', 'p27', 'p28', 'p29', 'p30', 'p31', 'p32', 'p33', 'p34', 'p35', 'p36', 'p37', 'p38', 'p39', 'p40', 'p41', 'p42', 'p43', 'p44', 'p45', 'p46', 'p47', 'p48', 'p49'] },   // every picture set from the Excel of Oct 2026
];

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const orderOf = (p) => Number(p.order) || 0;

// Pure: works out what needs to change. Nothing is written here.
// `imageIds`: which catalog items get their picture updated (null = all of them).
export function planCatalogMigration(liveProducts, catalog, newIds = [], imageIds = null) {
  const live = (liveProducts || []).map((p) => ({ ...p }));       // working copy
  const originalOrder = new Map(live.map((p) => [p.id, orderOf(p)]));

  // 1) Pair each catalog item with the shop's own copy: by id first, then by category + name
  //    (covers a service the shop deleted and re-added, which gets a new id)
  const pairOf = new Map();                                       // catalog id -> live product
  const taken = new Set();
  catalog.forEach((c) => {
    const hit = live.find((l) => l.id === c.id && !taken.has(l.id));
    if (hit) { pairOf.set(c.id, hit); taken.add(hit.id); }
  });
  catalog.forEach((c) => {
    if (pairOf.has(c.id)) return;
    const hit = live.find((l) => !taken.has(l.id) && l.categoryId === c.categoryId && norm(l.name) === norm(c.name));
    if (hit) { pairOf.set(c.id, hit); taken.add(hit.id); }
  });

  // 2) Pictures
  const imageUpdates = [];
  catalog.forEach((c) => {
    const l = pairOf.get(c.id);
    if (imageIds && !imageIds.includes(c.id)) return;
    if (l && c.imageUrl && l.imageUrl !== c.imageUrl) imageUpdates.push({ id: l.id, imageUrl: c.imageUrl });
  });

  // 3) New services (only those named in newIds, and only if the shop doesn't have them yet)
  const additions = [];
  const addedById = new Map();
  catalog.forEach((c) => {
    if (!newIds.includes(c.id) || pairOf.has(c.id)) return;

    const sameCat = catalog.filter((x) => x.categoryId === c.categoryId);
    let anchor = null;                                            // nearest earlier catalog item the shop has
    for (let j = sameCat.indexOf(c) - 1; j >= 0 && !anchor; j--) {
      anchor = pairOf.get(sameCat[j].id) || addedById.get(sameCat[j].id) || null;
    }

    const inCat = live.filter((l) => l.categoryId === c.categoryId);
    let newOrder;
    if (anchor) {
      newOrder = orderOf(anchor) + 1;
      inCat.forEach((l) => { if (l !== anchor && orderOf(l) > orderOf(anchor)) l.order = orderOf(l) + 1; });
    } else if (inCat.length) {
      newOrder = Math.min(...inCat.map(orderOf));                 // nothing earlier to follow: go first
      inCat.forEach((l) => { l.order = orderOf(l) + 1; });
    } else {
      newOrder = 1;
    }

    const created = { ...c, order: newOrder };
    live.push(created);
    additions.push(created);
    addedById.set(c.id, created);
  });

  // 4) Existing items that had to move down to make room
  const orderUpdates = live
    .filter((l) => originalOrder.has(l.id) && orderOf(l) !== originalOrder.get(l.id))
    .map((l) => ({ id: l.id, order: orderOf(l) }));

  return { imageUpdates, orderUpdates, additions, isNoop: !imageUpdates.length && !orderUpdates.length && !additions.length };
}

// Reads the saved version, applies the plan in ONE atomic batch together with the new version,
// so it either fully happens or doesn't happen at all (and is retried on the next load).
// The Firestore functions are passed in so this can be tested without a real database.
export async function runCatalogMigration({ firestore, db, appId, liveProducts, catalog, newIds = CATALOG_NEW_ITEM_IDS, version = CATALOG_VERSION }) {
  const { doc, collection, getDoc, writeBatch } = firestore;
  const shopRef = doc(db, 'artifacts', appId, 'shop', 'main');

  const snap = await getDoc(shopRef);
  const savedVersion = snap.exists() ? Number(snap.data().catalogVersion) || 0 : 0;
  if (savedVersion >= version) return { skipped: true };

  // Only the releases this shop hasn't had yet (a shop already on version 2 gets just version 3's pictures)
  const due = CATALOG_RELEASES.filter((r) => r.version > savedVersion && r.version <= version);
  const imageIds = due.some((r) => r.allImages) ? null : [...new Set(due.flatMap((r) => r.imageIds || []))];
  const dueNewIds = [...new Set(due.flatMap((r) => r.newIds || []))].filter((id) => newIds.includes(id));
  const plan = planCatalogMigration(liveProducts, catalog, dueNewIds, imageIds);
  const products = collection(db, 'artifacts', appId, 'shop', 'main', 'products');
  const batch = writeBatch(db);
  plan.imageUpdates.forEach((u) => batch.update(doc(products, u.id), { imageUrl: u.imageUrl }));
  plan.orderUpdates.forEach((u) => batch.update(doc(products, u.id), { order: u.order }));
  plan.additions.forEach((p) => batch.set(doc(products, p.id), p));
  batch.set(shopRef, { catalogVersion: version }, { merge: true });
  await batch.commit();
  return { skipped: false, plan };
}
