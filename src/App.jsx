import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, Home, FileText, BarChart2, Settings, Search, Plus, Minus, 
  Trash2, Edit, CheckCircle, X, Image as ImageIcon, Copy, Camera, FilePlus, 
  Layers, AlignJustify, Calendar, RefreshCw, ArrowUp, ArrowDown, User, DollarSign, Download
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const appId = 'inksurge-pos';

let app, auth, db;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase initialization warning (running in safe mode):", err);
}

const DEFAULT_CATEGORIES = [
  { id: 'cat_doc', name: 'Documents', icon: 'file', order: 1 },
  { id: 'cat_copy', name: 'Copy', icon: 'copy', order: 2 },
  { id: 'cat_photo', name: 'Photo', icon: 'camera', order: 3 },
  { id: 'cat_lam', name: 'Lamination', icon: 'layers', order: 4 },
  { id: 'cat_rush', name: 'Rush ID', icon: 'id', order: 5 },
  { id: 'cat_oth', name: 'Others', icon: 'more', order: 6 },
];

const DEFAULT_PRODUCTS = [
  { id: 'p1', categoryId: 'cat_doc', name: 'Black & White\n(Text Only)', price: 4.00, unit: 'page', imageUrl: '', order: 1 },
  { id: 'p2', categoryId: 'cat_doc', name: 'Black & White\n(Text+Image)', price: 5.00, unit: 'page', imageUrl: '', order: 2 },
  { id: 'p3', categoryId: 'cat_doc', name: 'Colored\n(Text Only)', price: 6.00, unit: 'page', imageUrl: '', order: 3 },
  { id: 'p4', categoryId: 'cat_doc', name: 'Colored\n(Text+Image)', price: 8.00, unit: 'page', imageUrl: '', order: 4 },
  { id: 'p5', categoryId: 'cat_copy', name: 'Black & White\n(Document)', price: 3.00, unit: 'page', imageUrl: '', order: 1 },
  { id: 'p6', categoryId: 'cat_copy', name: 'Colored\n(Document)', price: 8.00, unit: 'page', imageUrl: '', order: 2 },
  { id: 'p7', categoryId: 'cat_photo', name: 'A4\n(Photo print)', price: 50.00, unit: 'pc', imageUrl: '', order: 1 },
  { id: 'p8', categoryId: 'cat_photo', name: '8R\n(Photo print)', price: 45.00, unit: 'pc', imageUrl: '', order: 2 },
  { id: 'p9', categoryId: 'cat_photo', name: '6R\n(Photo print)', price: 30.00, unit: 'pc', imageUrl: '', order: 3 },
  { id: 'p10', categoryId: 'cat_photo', name: '5R\n(Photo print)', price: 18.00, unit: '2pcs', imageUrl: '', order: 4 },
  { id: 'p11', categoryId: 'cat_lam', name: 'ID\n(250-microns)', price: 45.00, unit: 'pc', imageUrl: '', order: 1 },
  { id: 'p12', categoryId: 'cat_lam', name: 'A4\n(Lamination)', price: 70.00, unit: 'pc', imageUrl: '', order: 2 },
];

function LoginScreen({ onLogin, error, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-white px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-blue-500/30">
            <Printer size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Inksurge Prints</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Staff Sign In</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@inksurge.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs font-semibold bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-blue-600/30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InksurgePOS() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Navigation State
  const [activeView, setActiveView] = useState('pos'); // pos, orders, reports, settings
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile/tablet nav drawer
  const [cartOpen, setCartOpen] = useState(false); // mobile/tablet order bottom-sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Data State
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState([]);
  
  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [additionalChargeInput, setAdditionalChargeInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // Delete Modal State
  const [orderToDelete, setOrderToDelete] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      // No Firebase configured (local preview) - skip login, run in demo mode.
      setUser({ uid: 'demo_user' });
      setLoading(false);
      return () => { isMounted = false; };
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser); // null until someone actually signs in
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async (email, password) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError('Incorrect email or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  useEffect(() => {
    if (!user || !db) return;
    const userId = user.uid;

    const catRef = collection(db, 'artifacts', appId, 'shop', 'main', 'categories');
    const prodRef = collection(db, 'artifacts', appId, 'shop', 'main', 'products');
    const ordRef = collection(db, 'artifacts', appId, 'shop', 'main', 'orders');

    // Subscribe to Categories
    const unsubCat = onSnapshot(query(catRef), (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_CATEGORIES.forEach(cat => setDoc(doc(catRef, cat.id), cat));
      } else {
        const cats = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(cats);
        if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id);
      }
    }, (err) => console.warn("Firestore categories fallback:", err));

    // Subscribe to Products
    const unsubProd = onSnapshot(query(prodRef), (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_PRODUCTS.forEach(prod => setDoc(doc(prodRef, prod.id), prod));
      } else {
        const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
        setProducts(prods);
      }
    }, (err) => console.warn("Firestore products fallback:", err));

    // Subscribe to Orders
    const unsubOrd = onSnapshot(query(ordRef), (snapshot) => {
      const ords = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp - a.timestamp);
      setOrders(ords);
    }, (err) => console.warn("Firestore orders fallback:", err));

    return () => {
      if (unsubCat) unsubCat();
      if (unsubProd) unsubProd();
      if (unsubOrd) unsubOrd();
    };
  }, [user]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const addToCart = (product, forceLong = false) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id 
          ? { ...item, qty: item.qty + 1, isLongSize: forceLong || item.isLongSize } 
          : item
        );
      }
      const isDocOrCopy = product.categoryId === 'cat_doc' || product.categoryId === 'cat_copy';
      return [...prev, { 
        productId: product.id, 
        categoryId: product.categoryId,
        name: product.name, 
        price: Number(product.price), 
        qty: 1, 
        imageUrl: product.imageUrl || '',
        isLongSize: isDocOrCopy && forceLong
      }];
    });
  };

  const toggleCartItemLongSize = (productId) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, isLongSize: !item.isLongSize };
      }
      return item;
    }));
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAdditionalCharge(0);
    setAdditionalChargeInput('');
    setCustomerName('');
    setEditingOrderId(null);
  };

  // Instant update for manual additional charge on input change
  const handleAdditionalChargeChange = (e) => {
    const val = e.target.value;
    setAdditionalChargeInput(val);
    const num = parseFloat(val);
    setAdditionalCharge(isNaN(num) || num < 0 ? 0 : num);
  };

  // Helper to compute unit price including long paper option (+₱2.00)
  const getItemUnitPrice = (item) => {
    const isDocOrCopy = item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy';
    return Number(item.price) + (isDocOrCopy && item.isLongSize ? 2.0 : 0);
  };

  const getItemTotal = (item) => {
    return getItemUnitPrice(item) * item.qty;
  };

  // Compute long paper charge for surcharge reference
  const longSizeCharge = useMemo(() => {
    return cart.reduce((sum, item) => {
      const isDocOrCopy = item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy';
      if (isDocOrCopy && item.isLongSize) {
        return sum + (item.qty * 2.0);
      }
      return sum;
    }, 0);
  }, [cart]);

  // Subtotal now directly sums item totals (which include long size paper charges)
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  }, [cart]);

  const totalAdditionalCharge = useMemo(() => {
    return additionalCharge || 0;
  }, [additionalCharge]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + totalAdditionalCharge;
  }, [cartSubtotal, totalAdditionalCharge]);

  const handleCheckout = async () => {
    if (cart.length === 0 || !customerName.trim()) return;

    const orderData = {
      items: cart,
      subtotal: cartSubtotal,
      longSizeCharge: longSizeCharge,
      additionalCharge: totalAdditionalCharge,
      total: cartTotal,
      customerName: customerName.trim(),
      timestamp: editingOrderId ? (orders.find(o => o.id === editingOrderId)?.timestamp || Date.now()) : Date.now()
    };

    if (db && user && user.uid !== 'demo_user') {
      try {
        const userId = user.uid;
        if (editingOrderId) {
          await updateDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'orders', editingOrderId), orderData);
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'shop', 'main', 'orders'), orderData);
        }
      } catch (err) {
        console.error("Error storing order in database:", err);
      }
    } else {
      if (editingOrderId) {
        setOrders(prev => prev.map(o => o.id === editingOrderId ? { ...orderData, id: editingOrderId } : o));
      } else {
        const localOrder = { ...orderData, id: 'ord_' + Date.now() };
        setOrders(prev => [localOrder, ...prev]);
      }
    }

    clearCart();
    if (editingOrderId) {
      setActiveView('orders');
    }
  };

  const handleEditOrder = (order) => {
    setCart(order.items || []);
    let manual = order.additionalCharge || 0;
    // Account for legacy saved orders where long paper charge was bundled into additionalCharge
    if (order.longSizeCharge && manual >= order.longSizeCharge) {
      manual = manual - order.longSizeCharge;
    }
    setAdditionalCharge(manual);
    setAdditionalChargeInput(manual > 0 ? manual.toString() : '');
    setCustomerName(order.customerName || '');
    setEditingOrderId(order.id);
    setActiveView('pos');
    setCartOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const id = orderToDelete.id;

    if (db && user && user.uid !== 'demo_user') {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'orders', id));
      } catch (err) {
        console.error("Error deleting order:", err);
      }
    } else {
      setOrders(prev => prev.filter(o => o.id !== id));
    }

    if (editingOrderId === id) {
      clearCart();
    }
    setOrderToDelete(null);
  };

  const getCategoryIcon = (iconName) => {
    switch(iconName) {
      case 'file': return <FileText size={22} className="mb-1" />;
      case 'copy': return <Copy size={22} className="mb-1" />;
      case 'camera': return <Camera size={22} className="mb-1" />;
      case 'layers': return <Layers size={22} className="mb-1" />;
      case 'id': return <FilePlus size={22} className="mb-1" />;
      default: return <AlignJustify size={22} className="mb-1" />;
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory ? p.categoryId === activeCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-white">
        <Printer size={48} className="animate-bounce text-blue-400 mb-4" />
        <h2 className="text-xl font-bold">Loading Inksurge POS...</h2>
        <p className="text-slate-400 text-sm mt-1">Preparing your printing catalog</p>
      </div>
    );
  }

  if (auth && !user) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;
  }

  const SettingsView = () => {
    const [editProd, setEditProd] = useState(null);
    const [editCat, setEditCat] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('services'); // 'services' | 'categories'

    // Save Product Handler
    const handleSaveProduct = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const prodData = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')) || 0,
        categoryId: formData.get('categoryId'),
        unit: formData.get('unit') || 'page',
        imageUrl: formData.get('imageUrl') || '',
        order: editProd?.order || products.length + 1
      };

      if (db && user && user.uid !== 'demo_user') {
        try {
          if (editProd && editProd.id) {
            await updateDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'products', editProd.id), prodData);
          } else {
            await addDoc(collection(db, 'artifacts', appId, 'shop', 'main', 'products'), prodData);
          }
        } catch (err) {
          console.error("Error saving service:", err);
        }
      } else {
        if (editProd && editProd.id) {
          setProducts(prev => prev.map(p => p.id === editProd.id ? { ...p, ...prodData } : p));
        } else {
          setProducts(prev => [...prev, { ...prodData, id: 'p_' + Date.now() }]);
        }
      }
      setEditProd(null);
    };

    // Save Category Handler
    const handleSaveCategory = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const catData = {
        name: formData.get('name'),
        icon: formData.get('icon') || 'more',
        order: editCat?.order || categories.length + 1
      };

      if (db && user && user.uid !== 'demo_user') {
        try {
          if (editCat && editCat.id) {
            await updateDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'categories', editCat.id), catData);
          } else {
            await addDoc(collection(db, 'artifacts', appId, 'shop', 'main', 'categories'), catData);
          }
        } catch (err) {
          console.error("Error saving category:", err);
        }
      } else {
        if (editCat && editCat.id) {
          setCategories(prev => prev.map(c => c.id === editCat.id ? { ...c, ...catData } : c));
        } else {
          setCategories(prev => [...prev, { ...catData, id: 'cat_' + Date.now() }]);
        }
      }
      setEditCat(null);
    };

    // Delete Product
    const handleDeleteProduct = async (id) => {
      if (db && user && user.uid !== 'demo_user') {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'products', id));
        } catch (err) {
          console.error("Error deleting product:", err);
        }
      } else {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    };

    // Reorder Product
    const handleMoveProduct = async (index, direction) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= products.length) return;
      
      const newProducts = [...products];
      const temp = newProducts[index];
      newProducts[index] = newProducts[targetIndex];
      newProducts[targetIndex] = temp;

      // Update order property
      const reordered = newProducts.map((p, idx) => ({ ...p, order: idx + 1 }));
      setProducts(reordered);

      if (db && user && user.uid !== 'demo_user') {
        reordered.forEach(p => {
          updateDoc(doc(db, 'artifacts', appId, 'shop', 'main', 'products', p.id), { order: p.order });
        });
      }
    };

    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Catalog & Service Settings</h2>
              <p className="text-slate-500 text-sm mt-1">Manage printing services, prices, images, and category sorting</p>
            </div>
            
            {/* Sub-tab Navigation */}
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button 
                onClick={() => setActiveSettingsTab('services')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeSettingsTab === 'services' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Services Catalog ({products.length})
              </button>
              <button 
                onClick={() => setActiveSettingsTab('categories')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeSettingsTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Categories ({categories.length})
              </button>
            </div>
          </div>

          {activeSettingsTab === 'services' ? (
            <>
              {/* Product Add / Edit Form */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                  {editProd ? 'Edit Service' : 'Add New Printing Service'}
                </h3>
                <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Service Title (use \n for newline)</label>
                    <input 
                      name="name" 
                      defaultValue={editProd?.name} 
                      required 
                      placeholder="e.g. Black & White\n(Text Only)"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                    <select 
                      name="categoryId" 
                      defaultValue={editProd?.categoryId || categories[0]?.id} 
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₱)</label>
                    <input 
                      name="price" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editProd?.price} 
                      required 
                      placeholder="0.00"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Billing Unit (e.g., page, pc, set)</label>
                    <input 
                      name="unit" 
                      defaultValue={editProd?.unit || 'page'} 
                      required 
                      placeholder="page"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Image URL (Optional)</label>
                    <input 
                      name="imageUrl" 
                      defaultValue={editProd?.imageUrl} 
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
                    {editProd && (
                      <button 
                        type="button" 
                        onClick={() => setEditProd(null)} 
                        className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-200 transition-colors"
                    >
                      {editProd ? 'Update Service' : 'Add Service'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Current Services List</h3>
                  <span className="text-xs font-semibold text-slate-500">Use ▲ ▼ to reorder items</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs uppercase font-bold text-slate-400 bg-slate-50/50">
                      <th className="p-4 w-12 text-center">Sort</th>
                      <th className="p-4">Service Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => (
                      <tr key={p.id} className="border-b hover:bg-slate-50/80 transition-colors text-sm">
                        <td className="p-2 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <button 
                              onClick={() => handleMoveProduct(idx, -1)} 
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 text-slate-600"
                            >
                              <ArrowUp size={14}/>
                            </button>
                            <button 
                              onClick={() => handleMoveProduct(idx, 1)} 
                              disabled={idx === products.length - 1}
                              className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 text-slate-600"
                            >
                              <ArrowDown size={14}/>
                            </button>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 whitespace-pre-line leading-snug">{p.name}</td>
                        <td className="p-4 text-slate-600">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium text-xs">
                            {categories.find(c => c.id === p.categoryId)?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-blue-600">₱{Number(p.price).toFixed(2)} <span className="text-slate-400 font-normal text-xs">/ {p.unit}</span></td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => setEditProd(p)} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Edit"
                            >
                              <Edit size={18}/>
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Delete"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Category Management Tab */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{editCat ? 'Edit Category' : 'Add Category'}</h3>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name</label>
                    <input 
                      name="name" 
                      defaultValue={editCat?.name} 
                      required 
                      placeholder="e.g. Stickers & Labels"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Icon Style</label>
                    <select 
                      name="icon" 
                      defaultValue={editCat?.icon || 'file'} 
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="file">File / Document</option>
                      <option value="copy">Copy</option>
                      <option value="camera">Photo / Camera</option>
                      <option value="layers">Lamination / Layers</option>
                      <option value="id">ID / Rush</option>
                      <option value="more">Others / More</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    {editCat && (
                      <button 
                        type="button" 
                        onClick={() => setEditCat(null)} 
                        className="px-4 py-2 border rounded-xl text-slate-600 text-sm font-bold"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200"
                    >
                      {editCat ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-800">Categories List</div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs uppercase font-bold text-slate-400 bg-slate-50/50">
                      <th className="p-4">Icon</th>
                      <th className="p-4">Category Name</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id} className="border-b hover:bg-slate-50 transition-colors text-sm">
                        <td className="p-4 text-slate-600">{getCategoryIcon(c.icon)}</td>
                        <td className="p-4 font-bold text-slate-800">{c.name}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setEditCat(c)} 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit size={18}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let salesToday = 0, salesYesterday = 0, salesMonth = 0, salesYear = 0;

    orders.forEach(o => {
      const orderDate = new Date(o.timestamp);
      if (orderDate >= today) salesToday += (o.total || 0);
      else if (orderDate >= yesterday && orderDate < today) salesYesterday += (o.total || 0);
      
      if (orderDate >= startOfMonth) salesMonth += (o.total || 0);
      if (orderDate >= startOfYear) salesYear += (o.total || 0);
    });

    const filteredOrders = orders.filter(o => {
      const oDate = new Date(o.timestamp);
      let isValid = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (oDate < start) isValid = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (oDate > end) isValid = false;
      }
      return isValid;
    });

    const rangeTotal = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const handleDownloadCSV = () => {
      if (filteredOrders.length === 0) return;
      const headers = ["Order ID", "Date", "Time", "Customer Name", "Items Purchased", "Subtotal (PHP)", "Additional Charge (PHP)", "Total Amount (PHP)"];
      const rows = filteredOrders.map(o => [
        `"${o.id}"`,
        `"${new Date(o.timestamp).toLocaleDateString()}"`,
        `"${new Date(o.timestamp).toLocaleTimeString()}"`,
        `"${(o.customerName || 'N/A').replace(/"/g, '""')}"`,
        `"${(o.items || []).map(i => `${i.qty}x ${i.name.replace(/\n/g, ' ')}${i.isLongSize ? ' [Long Paper]' : ''}`).join('; ')}"`,
        (o.subtotal || 0).toFixed(2),
        (o.additionalCharge || 0).toFixed(2),
        (o.total || 0).toFixed(2)
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Inksurge_Sales_Report_${startDate || 'all'}_to_${endDate || 'today'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800">Sales Reports & Analytics</h2>
            <p className="text-slate-500 text-sm mt-1">Overview of daily, monthly, and custom date range revenue</p>
          </div>

          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 border-y border-r border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Today</p>
              <p className="text-3xl font-black text-slate-800 mt-2">₱{salesToday.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 border-y border-r border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yesterday's Sales</p>
              <p className="text-3xl font-black text-slate-800 mt-2">₱{salesYesterday.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500 border-y border-r border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month's Sales</p>
              <p className="text-3xl font-black text-slate-800 mt-2">₱{salesMonth.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500 border-y border-r border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Year-to-Date Sales</p>
              <p className="text-3xl font-black text-slate-800 mt-2">₱{salesYear.toFixed(2)}</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center mb-3">
                  <Calendar size={18} className="mr-2 text-blue-600" />
                  Select Custom Date Range
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" 
                    />
                  </div>
                  <span className="text-slate-400 font-bold self-end pb-3">to</span>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" 
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="self-end mb-1 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100 flex items-center"
                    >
                      <RefreshCw size={14} className="mr-1"/> Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex flex-col justify-center min-w-[240px]">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {startDate || endDate ? 'Filtered Range Total' : 'Total Revenue (All Time)'}
                </p>
                <p className="text-3xl font-black text-blue-900 mt-1">₱{rangeTotal.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">{filteredOrders.length} transaction(s) found</p>
              </div>
            </div>
          </div>

          {/* Detailed History Table with Download CSV Button */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b bg-slate-50 flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800">Sales Transactions History</h3>
                <span className="text-xs text-slate-500 font-medium">{filteredOrders.length} records</span>
              </div>
              <button 
                onClick={handleDownloadCSV}
                disabled={filteredOrders.length === 0}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer disabled:cursor-not-allowed"
              >
                <Download size={14} className="mr-1.5" /> Download CSV
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="font-semibold text-slate-600">No transactions match the selected date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b text-xs uppercase font-bold text-slate-400 bg-slate-50/50">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4 w-1/3">Items Summary</th>
                      <th className="p-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="border-b hover:bg-slate-50/80 transition-colors text-sm">
                        <td className="p-4 text-slate-600 font-medium">
                          {new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="text-xs text-slate-400 block">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-400">{o.id.slice(-6).toUpperCase()}</td>
                        <td className="p-4 font-bold text-slate-800">{o.customerName || 'N/A'}</td>
                      <td className="p-4 text-slate-600">
                        {o.items?.map((item, idx) => {
                          const unitP = Number(item.price) + ((item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && item.isLongSize ? 2.0 : 0);
                          return (
                            <div key={idx} className="truncate text-xs py-0.5">
                              • {item.qty}x {item.name.replace('\n', ' ')}
                              {item.isLongSize && <span className="ml-1 text-blue-600 font-semibold">[Long Paper]</span>}
                              <span className="text-slate-400 font-normal ml-1">(₱{unitP.toFixed(2)})</span>
                            </div>
                          );
                        })}
                        {o.additionalCharge > 0 && (
                          <div className="text-xs font-semibold text-blue-600">+ Extra Charge: ₱{o.additionalCharge}</div>
                        )}
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-base">₱{(o.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OrdersView = () => (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Completed Orders</h2>
            <p className="text-slate-500 text-sm mt-1">View, edit, or remove past sales records</p>
          </div>
          <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded-full text-xs">
            {orders.length} Total Sales
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-bold text-lg">No orders recorded yet.</p>
              <p className="text-slate-400 text-sm mt-1">Complete sales from the POS terminal to see transactions here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b text-xs uppercase font-bold text-slate-400 bg-slate-50">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4 w-1/3">Order Breakdown</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b hover:bg-slate-50/80 transition-colors text-sm">
                      <td className="p-4 text-slate-600 font-medium">
                        {new Date(o.timestamp).toLocaleDateString()}
                        <span className="text-xs text-slate-400 block">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        <span className="flex items-center">
                          <User size={14} className="mr-1.5 text-slate-400" />
                          {o.customerName || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="space-y-1">
                          {o.items?.map((item, idx) => {
                            const unitP = Number(item.price) + ((item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && item.isLongSize ? 2.0 : 0);
                            return (
                              <div key={idx} className="text-xs flex justify-between pr-4">
                                <span>• {item.qty}x {item.name.replace('\n', ' ')} {item.isLongSize && <span className="text-blue-600 font-semibold">[Long]</span>}</span>
                                <span className="text-slate-400">(₱{unitP.toFixed(2)})</span>
                              </div>
                            );
                          })}
                          {o.additionalCharge > 0 && (
                            <div className="text-xs font-semibold text-blue-600 pt-0.5">+ Additional: ₱{o.additionalCharge}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-lg">₱{(o.total || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => handleEditOrder(o)} 
                            className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-xs font-bold border border-blue-100"
                          >
                            <Edit size={14} className="mr-1"/> Edit
                          </button>
                          <button 
                            onClick={() => setOrderToDelete(o)} 
                            className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold border border-red-100"
                          >
                            <Trash2 size={14} className="mr-1"/> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPOSView = () => (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Main Catalog Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Search Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center shadow-sm z-10">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search product or service... (e.g. A4, photo, laminate)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Categories Ribbon */}
        <div className="flex p-4 gap-3 overflow-x-auto bg-slate-50 border-b border-slate-200 scrollbar-hide">
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              className={`flex flex-col items-center justify-center min-w-[105px] py-3.5 px-3 rounded-2xl font-bold transition-all duration-200 ${
                activeCategory === cat.id && !searchQuery
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 border-transparent scale-105' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
              }`}
            >
              <div className={activeCategory === cat.id && !searchQuery ? 'text-white' : 'text-slate-500'}>
                {getCategoryIcon(cat.icon)}
              </div>
              <span className="text-xs mt-1">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
              <Printer size={48} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-600 text-lg">No services found</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting another category or clearing your search filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Service Preview Icon or Custom Image - 1:1 Square Container */}
                    <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center border border-slate-100 overflow-hidden group-hover:bg-blue-50/50 transition-colors">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400 group-hover:text-blue-600 transition-colors flex flex-col items-center">
                          {getCategoryIcon(categories.find(c => c.id === product.categoryId)?.icon)}
                        </div>
                      )}
                    </div>

                    {/* Service Title */}
                    <h3 className="font-bold text-slate-800 text-sm leading-snug whitespace-pre-line group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  {/* Price & Quick Add Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Price</span>
                      <span className="text-base font-black text-blue-600">
                        ₱{Number(product.price).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{product.unit}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm"
                      title="Add to order"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile/tablet trigger to open the order sheet */}
        {cart.length > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="lg:hidden flex items-center justify-between px-5 py-4 bg-emerald-600 text-white shadow-[0_-4px_16px_rgba(0,0,0,0.18)] active:bg-emerald-700 transition-colors shrink-0"
          >
            <span className="flex items-center font-bold text-sm">
              <span className="bg-white/20 rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-xs mr-2">
                {cart.reduce((sum, i) => sum + i.qty, 0)}
              </span>
              View Order
            </span>
            <span className="font-black text-base">₱{cartTotal.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* Backdrop for the order sheet (mobile/tablet only) */}
      {cartOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Current Order Cart Sidebar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[88vh] bg-white shadow-2xl flex flex-col rounded-t-3xl transform transition-transform duration-200 ease-in-out
          lg:static lg:z-20 lg:max-h-none lg:rounded-none lg:translate-y-0 lg:w-[380px] xl:w-[440px] lg:border-l lg:border-slate-200
          ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle (mobile/tablet only) */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
        </div>

        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 flex items-center">
            {editingOrderId ? (
              <><Edit size={18} className="mr-2 text-blue-600"/> Editing Order</>
            ) : (
              'Current Order'
            )}
          </h2>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button 
                onClick={clearCart} 
                className="flex items-center px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-red-100"
              >
                <Trash2 size={14} className="mr-1"/> Clear All
              </button>
            )}
            <button
              onClick={() => setCartOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                 <Printer size={32} className="text-slate-300" />
               </div>
               <p className="font-bold text-slate-600">Cart is empty</p>
               <p className="text-xs text-slate-400 mt-1">Select items from catalog to begin</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 px-1">
                <div className="flex-1">Item</div>
                <div className="w-20 text-center">Qty</div>
                <div className="w-14 text-right">Price</div>
                <div className="w-16 text-right">Total</div>
              </div>

              {cart.map(item => {
                const itemUnitPrice = getItemUnitPrice(item);
                const itemTotal = getItemTotal(item);
                return (
                  <div key={item.productId} className="py-2 border-b border-slate-100 hover:bg-slate-50/80 rounded-xl px-1 transition-colors">
                    <div className="flex items-center gap-2.5 text-xs">
                      {/* Compact Item Square Image Thumbnail */}
                      <div className="w-9 h-9 aspect-square rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={16} />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="font-bold text-slate-800 whitespace-pre-line leading-snug text-xs">{item.name}</p>
                        
                        {/* Long Size Paper Option Checkbox */}
                        {(item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && (
                          <label className="mt-1 flex items-center space-x-1 cursor-pointer text-slate-700 font-semibold text-[11px]">
                            <input 
                              type="checkbox"
                              checked={!!item.isLongSize}
                              onChange={() => toggleCartItemLongSize(item.productId)}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Long size <span className="text-blue-600 font-medium">(+₱2.00)</span></span>
                          </label>
                        )}
                      </div>
                      
                      {/* Quantity Selector */}
                      <div className="w-20 flex items-center justify-between bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm flex-shrink-0">
                        <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><Minus size={12}/></button>
                        <span className="font-bold text-slate-800 text-xs">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><Plus size={12}/></button>
                      </div>
                      
                      {/* Price per unit */}
                      <div className="w-14 text-right text-slate-500 font-medium text-xs flex-shrink-0">₱{itemUnitPrice.toFixed(2)}</div>
                      
                      {/* Total Price & Delete Action */}
                      <div className="w-16 flex items-center justify-end font-black text-slate-900 text-xs flex-shrink-0">
                        <span>₱{itemTotal.toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 ml-1 p-0.5">
                          <X size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Totals & Required Customer Form */}
        <div className="p-5 bg-white border-t border-slate-200 shadow-lg space-y-3.5">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">Subtotal</span>
            <span className="text-sm font-bold text-slate-800">₱{cartSubtotal.toFixed(2)}</span>
          </div>

          {/* Additional Charge */}
          <div className="flex justify-between items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold whitespace-nowrap">Additional Charge</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
              <input 
                type="number" 
                placeholder="0.00" 
                value={additionalChargeInput}
                onChange={handleAdditionalChargeChange}
                className="w-24 p-1.5 pl-6 text-right border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* REQUIRED Customer Name Input */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Customer Name <span className="text-red-500">*</span></span>
              {!customerName.trim() && cart.length > 0 && (
                <span className="text-[10px] text-red-500 font-semibold">Required</span>
              )}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Enter customer name..." 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full p-2 pl-8 text-xs border rounded-xl outline-none transition-all ${
                  !customerName.trim() && cart.length > 0 
                    ? 'border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-500' 
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
                required
              />
            </div>
          </div>

          {/* Final Total */}
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
            <span className="text-xl font-black text-slate-900">Total</span>
            <span className="text-2xl font-black text-blue-600">₱{cartTotal.toFixed(2)}</span>
          </div>

          {/* Checkout Action Button */}
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || !customerName.trim()}
            className={`w-full py-3.5 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 shadow-md ${
              (cart.length === 0 || !customerName.trim()) 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : editingOrderId 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:-translate-y-0.5'
            }`}
          >
            {editingOrderId ? (
              <><Edit className="mr-2" size={18}/> Update Order</>
            ) : (
              <><CheckCircle className="mr-2" size={18}/> Complete Sale</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 font-sans text-slate-800">
      {/* Backdrop for the nav drawer (mobile/tablet only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Navigation Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col shadow-2xl border-r border-slate-800 transform transition-transform duration-200 ease-in-out
          lg:static lg:z-30 lg:w-64 lg:max-w-none lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-md shadow-blue-500/30">
              <Printer size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-white">Inksurge Prints</h1>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold tracking-wider uppercase">Print • Copy • Scan</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button 
            onClick={() => { setActiveView('pos'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'pos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className="mr-3" size={18} /> POS Terminal
          </button>
          
          <button 
            onClick={() => { setActiveView('orders'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="mr-3" size={18} /> Orders
          </button>
          
          <button 
            onClick={() => { setActiveView('reports'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart2 className="mr-3" size={18} /> Reports
          </button>
          
          <button 
            onClick={() => { setActiveView('settings'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="mr-3" size={18} /> Settings
          </button>
        </nav>

        {/* Signed-in staff + logout */}
        {auth && user && user.email && (
          <div className="px-6 pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span className="truncate flex items-center"><User size={12} className="mr-1.5 shrink-0" />{user.email}</span>
            <button onClick={handleLogout} className="ml-2 shrink-0 font-bold text-slate-400 hover:text-white transition-colors">
              Log out
            </button>
          </div>
        )}

        {/* Footer Slogan */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
           <div className="text-slate-400 mb-3 opacity-70">
             <p className="text-sm font-bold italic">Your Prints,</p>
             <p className="text-sm font-bold italic ml-3 text-blue-400">Our Priority!</p>
           </div>
           <div className="flex items-center text-xs text-slate-500">
             <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
             Inksurge System Online
           </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-100">
        {/* Mobile/tablet top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-md z-20 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Open menu"
          >
            <AlignJustify size={22} />
          </button>
          <div className="flex items-center">
            <Printer size={16} className="mr-2 text-blue-400" />
            <span className="font-black text-sm tracking-tight">Inksurge Prints</span>
          </div>
          <div className="w-9" aria-hidden="true" />
        </div>

        <div className="flex-1 min-h-0">
          {activeView === 'pos' && renderPOSView()}
          {activeView === 'orders' && <OrdersView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Delete Transaction?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete order for <span className="font-bold text-slate-700">{orderToDelete.customerName || 'N/A'}</span> (₱{orderToDelete.total?.toFixed(2)})? This action cannot be undone.
            </p>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setOrderToDelete(null)} 
                className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteOrder} 
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-colors shadow-md shadow-red-200"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}