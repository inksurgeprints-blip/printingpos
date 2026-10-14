// Saving and loading expenses.
//
// Expenses live in their own collection next to orders/products/categories:
//   artifacts/{appId}/shop/main/expenses/{id}
// so they can never be mixed up with, or change, a sale. The Firestore functions are passed
// in (rather than imported) so this can be tested without a real database.

const path = (appId) => ['artifacts', appId, 'shop', 'main', 'expenses'];

// Live list of expenses; calls onData(list) now and after every change. Returns the unsubscribe function.
export function subscribeExpenses({ firestore, db, appId, onData, onError }) {
  const { collection, query, onSnapshot } = firestore;
  return onSnapshot(
    query(collection(db, ...path(appId))),
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function addExpense({ firestore, db, appId, expense }) {
  const { collection, addDoc } = firestore;
  const ref = await addDoc(collection(db, ...path(appId)), expense);
  return ref.id;
}

export async function updateExpense({ firestore, db, appId, id, changes }) {
  const { doc, updateDoc } = firestore;
  await updateDoc(doc(db, ...path(appId), id), changes);
}

export async function deleteExpense({ firestore, db, appId, id }) {
  const { doc, deleteDoc } = firestore;
  await deleteDoc(doc(db, ...path(appId), id));
}
