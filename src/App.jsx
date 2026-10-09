import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, Home, FileText, BarChart2, Settings, Search, Plus, Minus, 
  Trash2, Edit, CheckCircle, X, Image as ImageIcon, Copy, Camera, FilePlus, 
  Layers, AlignJustify, Calendar, RefreshCw, ArrowUp, ArrowDown, User, DollarSign, Download, Upload, GripVertical, Share2
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, addDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';

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

const CATEGORY_ORDER_MAP = DEFAULT_CATEGORIES.reduce((acc, c) => { acc[c.id] = c.order; return acc; }, {});

const DEFAULT_PRODUCTS = [
  { id: 'p1', categoryId: 'cat_doc', name: 'B&W - Text Only', price: 4.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394771818-d86a205c-a6d2-428b-8287-429b4feebcbc.jpg', order: 1 },
  { id: 'p2', categoryId: 'cat_doc', name: 'B&W - Text+Image', price: 5.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394933925-1d7a77e1-5e41-45c6-b7c3-f34eef9756a4.jpg', order: 2 },
  { id: 'p3', categoryId: 'cat_doc', name: 'B&W - Half-Image', price: 6.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394891530-560d6c01-68ab-4a3a-b191-cfd2af1c8ff9.jpg', order: 3 },
  { id: 'p4', categoryId: 'cat_doc', name: 'B&W - Full-Image', price: 8.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394896239-51775420-b96b-4be3-85b1-bc5b69f8e84c.jpg', order: 4 },
  { id: 'p5', categoryId: 'cat_doc', name: 'Color - Text Only', price: 6.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394899896-013db57a-45b5-436f-8ccd-ea509bca1b0b.jpg', order: 5 },
  { id: 'p6', categoryId: 'cat_doc', name: 'Color - Text+Image', price: 8.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394905645-e58b54e5-608b-4773-8dd0-7b84e42a09c1.jpg', order: 6 },
  { id: 'p7', categoryId: 'cat_doc', name: 'Color - Half-Image', price: 9.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394911987-44350b24-fcfb-4554-a2d1-a487cd5ad14a.jpg', order: 7 },
  { id: 'p8', categoryId: 'cat_doc', name: 'Color - Full-Image', price: 13.00, unit: 'page', imageUrl: 'https://www.image2url.com/r2/default/images/1790394919584-5c7fc92a-750f-4a6f-9f48-55ec12daf736.jpg', order: 8 },
  { id: 'p9', categoryId: 'cat_copy', name: 'B&W - Document', price: 3.00, unit: 'page', imageUrl: 'https://imgv2-1-f.scribdassets.com/img/document/695036304/original/e0e5e955b0/1?v=1', order: 1 },
  { id: 'p10', categoryId: 'cat_copy', name: 'B&W - Front&Back ID', price: 4.00, unit: 'page', imageUrl: 'https://i.ytimg.com/vi/6mlLQXX_xYo/maxresdefault.jpg', order: 2 },
  { id: 'p11', categoryId: 'cat_copy', name: 'Color - Document/ID', price: 8.00, unit: 'page', imageUrl: 'https://i.pinimg.com/736x/54/39/16/543916392604de744f9cad775ac5a9b1.jpg', order: 3 },
  { id: 'p12', categoryId: 'cat_copy', name: 'Scan', price: 10.00, unit: 'page', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Epson_V850_scanner_open_20230920.jpg?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=original', order: 4 },
  { id: 'p13', categoryId: 'cat_photo', name: 'A4 Photo', price: 50.00, unit: 'pc', imageUrl: 'https://www.framesnow.com.au/cdn/shop/files/Premium_Timber_Finish_Black_A4_Picture_Frame_with_Matting_Professional_Display_for_Art_Prints_Certificates_1000x1000.webp?v=1759927052', order: 1 },
  { id: 'p14', categoryId: 'cat_photo', name: '8R Photo', price: 45.00, unit: 'pc', imageUrl: 'https://ph-live-01.slatic.net/p/6a203ea2aadf198f1270eebb77535e75.jpg', order: 2 },
  { id: 'p15', categoryId: 'cat_photo', name: '6R Photo', price: 30.00, unit: 'pc', imageUrl: 'https://ph-test-11.slatic.net/p/9b01ce43fd7bb467d2d8a740dd8ed71d.jpg', order: 3 },
  { id: 'p16', categoryId: 'cat_photo', name: '5R Photo', price: 18.00, unit: 'pc', imageUrl: 'https://ph-test-11.slatic.net/p/2504cfbdc913b2503477d95a9cc571b1.jpg', order: 4 },
  { id: 'p17', categoryId: 'cat_photo', name: '4R Photo', price: 16.00, unit: 'pc', imageUrl: 'https://ph-test-11.slatic.net/p/77712a4d0eb78f5b39c5e0f8ce94328b.jpg', order: 5 },
  { id: 'p18', categoryId: 'cat_photo', name: '3R Photo', price: 11.00, unit: 'pc', imageUrl: 'https://ph-test-11.slatic.net/p/e59fca3c20288be30a38993609cced85.jpg', order: 6 },
  { id: 'p19', categoryId: 'cat_photo', name: '2R / Wallet Size', price: 8.00, unit: 'pc', imageUrl: 'https://axwellwallet.com/cdn/shop/articles/1_5d1e2796-10f7-4ff5-8406-a0f94738b2e4.jpg?v=1738868313&width=2048', order: 7 },
  { id: 'p20', categoryId: 'cat_photo', name: 'Instax Mini 4pcs', price: 30.00, unit: 'set', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8M2m6PD1G5LlWFMXeN__OzgrWdG3i3ibtrYeSxBwDkw&s', order: 8 },
  { id: 'p21', categoryId: 'cat_photo', name: 'Instax Mini 10pcs', price: 55.00, unit: 'set', imageUrl: 'https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/2684385081374a07ba1ce456997c1690~tplv-aphluv4xwc-crop-webp:4284:5712.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my2&from=2378011839', order: 9 },
  { id: 'p22', categoryId: 'cat_photo', name: 'Instax Mini 20pcs', price: 95.00, unit: 'set', imageUrl: 'https://cf.shopee.ph/file/1041cab6489528f703c0ccd78b630f55', order: 10 },
  { id: 'p23', categoryId: 'cat_photo', name: '3-Grid Photo Strip 2pcs', price: 20.00, unit: 'set', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKmaNsOapOFAyHQMgDBC07yuwz00EfunQXqhDbpxrw4qM9CO5Pn_cKfWVe&s=10', order: 11 },
  { id: 'p24', categoryId: 'cat_lam', name: 'ID 250mic', price: 45.00, unit: 'pc', imageUrl: 'https://www.printyourdesign.com.ph/supplier_product/s/display_image/98/710/408/laminated_ID.jpg?0', order: 1 },
  { id: 'p25', categoryId: 'cat_lam', name: 'ID 125mic', price: 35.00, unit: 'pc', imageUrl: 'https://www.printyourdesign.com.ph/supplier_product/s/display_image/98/710/408/laminated_ID.jpg?0', order: 2 },
  { id: 'p26', categoryId: 'cat_lam', name: 'ID 250mic - Print+Laminate', price: 55.00, unit: 'pc', imageUrl: 'https://www.printyourdesign.com.ph/supplier_product/s/display_image/98/710/408/laminated_ID.jpg?0', order: 3 },
  { id: 'p27', categoryId: 'cat_lam', name: 'ID 125mic - Print+Laminate', price: 45.00, unit: 'pc', imageUrl: 'https://www.printyourdesign.com.ph/supplier_product/s/display_image/98/710/408/laminated_ID.jpg?0', order: 4 },
  { id: 'p28', categoryId: 'cat_lam', name: 'A6 250mic', price: 50.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S8df17eaf802b490b80472358de5f55032.jpg', order: 5 },
  { id: 'p29', categoryId: 'cat_lam', name: 'A6 125mic', price: 40.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S8df17eaf802b490b80472358de5f55032.jpg', order: 6 },
  { id: 'p30', categoryId: 'cat_lam', name: 'A6 250mic - Print+Laminate', price: 65.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S8df17eaf802b490b80472358de5f55032.jpg', order: 7 },
  { id: 'p31', categoryId: 'cat_lam', name: 'A6 125mic - Print+Laminate', price: 55.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S8df17eaf802b490b80472358de5f55032.jpg', order: 8 },
  { id: 'p32', categoryId: 'cat_lam', name: 'A5 250mic', price: 58.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S1c23cadc729047a0944baf43033cf62c3.jpg', order: 9 },
  { id: 'p33', categoryId: 'cat_lam', name: 'A5 125mic', price: 48.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S1c23cadc729047a0944baf43033cf62c3.jpg', order: 10 },
  { id: 'p34', categoryId: 'cat_lam', name: 'A5 250mic - Print+Laminate', price: 73.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S1c23cadc729047a0944baf43033cf62c3.jpg', order: 11 },
  { id: 'p35', categoryId: 'cat_lam', name: 'A5 125mic - Print + Laminate', price: 63.00, unit: 'pc', imageUrl: 'https://ae-pic-a1.aliexpress-media.com/kf/S1c23cadc729047a0944baf43033cf62c3.jpg', order: 12 },
  { id: 'p36', categoryId: 'cat_lam', name: 'A4 250mic', price: 70.00, unit: 'pc', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgaFZrvtwZFfSbc27va0DzvA7VmSlE7-qId1MdXHEAaXdvazfnKAZ3X2n8&s=10', order: 13 },
  { id: 'p37', categoryId: 'cat_lam', name: 'A4 125mic', price: 60.00, unit: 'pc', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgaFZrvtwZFfSbc27va0DzvA7VmSlE7-qId1MdXHEAaXdvazfnKAZ3X2n8&s=10', order: 14 },
  { id: 'p38', categoryId: 'cat_lam', name: 'A4 250mic - Print+Laminate', price: 85.00, unit: 'pc', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgaFZrvtwZFfSbc27va0DzvA7VmSlE7-qId1MdXHEAaXdvazfnKAZ3X2n8&s=10', order: 15 },
  { id: 'p39', categoryId: 'cat_lam', name: 'A4 125mic - Print+Laminate', price: 75.00, unit: 'pc', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgaFZrvtwZFfSbc27va0DzvA7VmSlE7-qId1MdXHEAaXdvazfnKAZ3X2n8&s=10', order: 16 },
  { id: 'p40', categoryId: 'cat_rush', name: 'Package A', price: 40.00, unit: 'set', imageUrl: '', order: 1 },
  { id: 'p41', categoryId: 'cat_rush', name: 'Package B', price: 40.00, unit: 'set', imageUrl: '', order: 2 },
  { id: 'p42', categoryId: 'cat_rush', name: 'Package C', price: 40.00, unit: 'set', imageUrl: '', order: 3 },
  { id: 'p43', categoryId: 'cat_rush', name: 'Package D', price: 45.00, unit: 'set', imageUrl: '', order: 4 },
  { id: 'p44', categoryId: 'cat_rush', name: 'Package E', price: 55.00, unit: 'set', imageUrl: '', order: 5 },
  { id: 'p45', categoryId: 'cat_oth', name: 'Sticker Print - 1/4', price: 25.00, unit: 'page', imageUrl: '', order: 1 },
  { id: 'p46', categoryId: 'cat_oth', name: 'Sticker Print - Half', price: 35.00, unit: 'page', imageUrl: '', order: 2 },
  { id: 'p47', categoryId: 'cat_oth', name: 'Sticker Print - Full', price: 60.00, unit: 'page', imageUrl: '', order: 3 },
  { id: 'p48', categoryId: 'cat_oth', name: 'Sintra - Flat', price: 135.00, unit: 'pc', imageUrl: '', order: 4 },
  { id: 'p49', categoryId: 'cat_oth', name: 'Sintra - 3D Box', price: 200.00, unit: 'pc', imageUrl: '', order: 5 },
];

const DEFAULT_CHARGE_NOTE = 'Editing / Formatting Fee';
const DEFAULT_SYSTEM_NAME = 'Inksurge Prints';
const DEFAULT_LOGO_URL = '';

function BrandLogo({ logoUrl, size = 40, iconSize = 20, rounded = 'rounded-xl', className = '' }) {
  return (
    <div
      className={`bg-blue-600 ${rounded} flex items-center justify-center shadow-md shadow-blue-500/30 overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
      ) : (
        <Printer size={iconSize} className="text-white" />
      )}
    </div>
  );
}

function LoginScreen({ onLogin, error, loading, systemName, logoUrl }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="login-screen flex flex-col h-screen items-center justify-center bg-slate-900 text-white px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo logoUrl={logoUrl} size={56} iconSize={28} className="mb-3" />
          <h1 className="text-xl font-black tracking-tight">{systemName || DEFAULT_SYSTEM_NAME}</h1>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Staff Sign In</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-400 mb-1.5">Email</label>
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
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-400 mb-1.5">Password</label>
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
  const [systemName, setSystemName] = useState(DEFAULT_SYSTEM_NAME);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  
  // Navigation State
  const [activeView, setActiveView] = useState('pos'); // pos, orders, reports, settings
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile/tablet nav drawer
  const [cartOpen, setCartOpen] = useState(false); // mobile/tablet order bottom-sheet
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('inksurge_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch (err) { /* localStorage unavailable - fall through */ }
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('inksurge_dark_mode', darkMode.toString());
    } catch (err) { /* localStorage unavailable - preference just won't persist */ }
  }, [darkMode]);

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
  const [additionalChargeNote, setAdditionalChargeNote] = useState('');
  const [noteTouched, setNoteTouched] = useState(false); // true once the user edits the note themselves
  const [customerName, setCustomerName] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editDateTimeInput, setEditDateTimeInput] = useState(''); // only used while editing an existing order
  
  // Delete Modal State
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const receiptRef = useRef(null);
  const [processingReceipt, setProcessingReceipt] = useState(null); // 'download' | 'share' | null
  const [receiptNotice, setReceiptNotice] = useState('');

  useEffect(() => {
    setProcessingReceipt(null);
    setReceiptNotice('');
  }, [viewingOrder]);

  const captureReceiptCanvas = () => {
    if (!receiptRef.current) return Promise.reject(new Error('Receipt not ready'));
    return html2canvas(receiptRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
  };

  const getReceiptFileName = () => {
    const name = (viewingOrder?.customerName || 'Customer').replace(/[^a-z0-9]+/gi, '_');
    const dateStr = viewingOrder?.timestamp ? new Date(viewingOrder.timestamp).toISOString().slice(0, 10) : 'order';
    return `Receipt_${name}_${dateStr}.jpg`;
  };

  const handleDownloadReceipt = async () => {
    setProcessingReceipt('download');
    setReceiptNotice('');
    try {
      const canvas = await captureReceiptCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = getReceiptFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate receipt image:', err);
      setReceiptNotice("Couldn't generate the receipt image. Please try again.");
    } finally {
      setProcessingReceipt(null);
    }
  };

  const handleShareReceipt = async () => {
    setProcessingReceipt('share');
    setReceiptNotice('');
    try {
      const canvas = await captureReceiptCanvas();
      const fileName = getReceiptFileName();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setReceiptNotice("Couldn't generate the receipt image. Please try again.");
          setProcessingReceipt(null);
          return;
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Receipt',
              text: `Here's your receipt from ${systemName}.`,
            });
          } catch (err) {
            // Share sheet dismissed/cancelled - not an error worth surfacing
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setReceiptNotice('Sharing isn\'t available here, so the image was downloaded instead — open Messenger and attach it from your downloads or photos.');
        }
        setProcessingReceipt(null);
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Failed to share receipt image:', err);
      setReceiptNotice("Couldn't generate the receipt image. Please try again.");
      setProcessingReceipt(null);
    }
  };

  useEffect(() => {
    document.title = systemName || DEFAULT_SYSTEM_NAME;
  }, [systemName]);

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

    const brandingRef = doc(db, 'artifacts', appId, 'shop', 'main');

    // Subscribe to Branding (system name + logo), shared across every device
    const unsubBranding = onSnapshot(brandingRef, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setSystemName(data.systemName || DEFAULT_SYSTEM_NAME);
      setLogoUrl(data.logoUrl || DEFAULT_LOGO_URL);
    }, (err) => console.warn("Firestore branding fallback:", err));

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
        const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
          const catDiff = (CATEGORY_ORDER_MAP[a.categoryId] ?? 999) - (CATEGORY_ORDER_MAP[b.categoryId] ?? 999);
          return catDiff !== 0 ? catDiff : (a.order || 0) - (b.order || 0);
        });
        setProducts(prods);
      }
    }, (err) => console.warn("Firestore products fallback:", err));

    // Subscribe to Orders
    const unsubOrd = onSnapshot(query(ordRef), (snapshot) => {
      const ords = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp - a.timestamp);
      setOrders(ords);
    }, (err) => console.warn("Firestore orders fallback:", err));

    return () => {
      if (unsubBranding) unsubBranding();
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

  const generateLineId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const addToCart = (product, forceLong = false) => {
    setCart(prev => {
      const isDocOrCopy = product.categoryId === 'cat_doc' || product.categoryId === 'cat_copy';
      const wantsLong = isDocOrCopy && forceLong;

      // Clicking the same service again raises the quantity of its existing line.
      // Exception: a line with Long Size Paper ticked is never added to - each
      // long-size line is its own item - so the click starts a new line instead.
      if (!wantsLong) {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].productId === product.id && !prev[i].isLongSize) {
            return prev.map((item, idx) => idx === i ? { ...item, qty: item.qty + 1 } : item);
          }
        }
      }

      return [...prev, { 
        lineId: generateLineId(),
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

  const toggleCartItemLongSize = (lineId) => {
    setCart(prev => prev.map(item => {
      if (item.lineId === lineId) {
        return { ...item, isLongSize: !item.isLongSize };
      }
      return item;
    }));
  };

  const updateCartQty = (lineId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.lineId === lineId) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeFromCart = (lineId) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  };

  const clearCart = () => {
    setCart([]);
    setAdditionalCharge(0);
    setAdditionalChargeInput('');
    setAdditionalChargeNote('');
    setNoteTouched(false);
    setCustomerName('');
    setEditingOrderId(null);
    setEditDateTimeInput('');
  };

  // Formats a timestamp for a <input type="datetime-local"> value, in local time
  // (not UTC - a plain toISOString() would shift the displayed time by the timezone offset).
  const formatForDateTimeInput = (ts) => {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Instant update for manual additional charge on input change
  const handleAdditionalChargeChange = (e) => {
    const val = e.target.value;
    setAdditionalChargeInput(val);
    const num = parseFloat(val);
    const amount = isNaN(num) || num < 0 ? 0 : num;
    setAdditionalCharge(amount);

    if (amount > 0) {
      // Pre-fill the default description once, unless the user already wrote their own
      if (!noteTouched && !additionalChargeNote) {
        setAdditionalChargeNote(DEFAULT_CHARGE_NOTE);
      }
    } else {
      // No additional charge -> no note
      setAdditionalChargeNote('');
      setNoteTouched(false);
    }
  };

  const handleAdditionalChargeNoteChange = (e) => {
    setAdditionalChargeNote(e.target.value);
    setNoteTouched(true);
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
      additionalChargeNote: totalAdditionalCharge > 0 ? additionalChargeNote.trim() : '',
      total: cartTotal,
      customerName: customerName.trim(),
      timestamp: editingOrderId
        ? (() => {
            const parsed = editDateTimeInput ? new Date(editDateTimeInput).getTime() : NaN;
            return !isNaN(parsed) ? parsed : (orders.find(o => o.id === editingOrderId)?.timestamp || Date.now());
          })()
        : Date.now()
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
    // Older saved orders may predate per-line IDs - backfill so each line
    // still behaves as its own independent item when editing.
    setCart((order.items || []).map(item => ({ ...item, lineId: item.lineId || generateLineId() })));
    let manual = order.additionalCharge || 0;
    // Account for legacy saved orders where long paper charge was bundled into additionalCharge
    if (order.longSizeCharge && manual >= order.longSizeCharge) {
      manual = manual - order.longSizeCharge;
    }
    setAdditionalCharge(manual);
    setAdditionalChargeInput(manual > 0 ? manual.toString() : '');
    setAdditionalChargeNote(manual > 0 ? (order.additionalChargeNote || '') : '');
    // Don't auto-overwrite what was already saved on this order
    setNoteTouched(manual > 0);
    setCustomerName(order.customerName || '');
    setEditingOrderId(order.id);
    setEditDateTimeInput(formatForDateTimeInput(order.timestamp || Date.now()));
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
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Preparing your printing catalog</p>
      </div>
    );
  }

  if (auth && !user) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} systemName={systemName} logoUrl={logoUrl} />;
  }

  const SettingsView = () => {
    const [editProd, setEditProd] = useState(null);
    const [editCat, setEditCat] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('services'); // 'services' | 'categories' | 'appearance'

    // Branding (System Name + Logo) form state
    const [draftSystemName, setDraftSystemName] = useState(systemName);
    const [draftLogoUrl, setDraftLogoUrl] = useState(logoUrl);
    const [savingBranding, setSavingBranding] = useState(false);
    const [brandingSaved, setBrandingSaved] = useState(false);
    const [logoError, setLogoError] = useState('');
    const logoInputRef = useRef(null);

    useEffect(() => { setDraftSystemName(systemName); }, [systemName]);
    useEffect(() => { setDraftLogoUrl(logoUrl); }, [logoUrl]);

    const handleLogoFileChange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setLogoError('');
      if (!file.type.startsWith('image/')) {
        setLogoError('Please choose an image file (PNG, JPG, etc).');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Resize client-side so the logo stays small and fast everywhere it's shown
          const maxDim = 320;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          setDraftLogoUrl(canvas.toDataURL('image/png'));
        };
        img.onerror = () => setLogoError("Couldn't read that image. Try a different file.");
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };

    const handleRemoveLogo = () => setDraftLogoUrl('');

    const handleSaveBranding = async () => {
      setSavingBranding(true);
      const brandingData = {
        systemName: draftSystemName.trim() || DEFAULT_SYSTEM_NAME,
        logoUrl: draftLogoUrl || '',
      };
      if (db && user && user.uid !== 'demo_user') {
        try {
          await setDoc(doc(db, 'artifacts', appId, 'shop', 'main'), brandingData, { merge: true });
        } catch (err) {
          console.error('Failed to save branding:', err);
        }
      } else {
        setSystemName(brandingData.systemName);
        setLogoUrl(brandingData.logoUrl);
      }
      setSavingBranding(false);
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2000);
    };

    const brandingDirty = draftSystemName !== systemName || draftLogoUrl !== logoUrl;

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
    // Drag-to-reorder state: which item is being dragged, and which item it's
    // currently hovering over. Reordering is always scoped to one category.
    const [dragState, setDragState] = useState(null); // { categoryId, draggedId, overId }

    const getCategoryProducts = (categoryId) => {
      const base = products.filter(p => p.categoryId === categoryId).sort((a, b) => (a.order || 0) - (b.order || 0));
      if (dragState && dragState.categoryId === categoryId && dragState.overId && dragState.draggedId !== dragState.overId) {
        const fromIdx = base.findIndex(p => p.id === dragState.draggedId);
        const toIdx = base.findIndex(p => p.id === dragState.overId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const copy = [...base];
          const [moved] = copy.splice(fromIdx, 1);
          copy.splice(toIdx, 0, moved);
          return copy;
        }
      }
      return base;
    };

    const commitReorder = (categoryId, draggedId, overId) => {
      if (!overId || draggedId === overId) return;
      const base = products.filter(p => p.categoryId === categoryId).sort((a, b) => (a.order || 0) - (b.order || 0));
      const fromIdx = base.findIndex(p => p.id === draggedId);
      const toIdx = base.findIndex(p => p.id === overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      const copy = [...base];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      const reordered = copy.map((p, idx) => ({ ...p, order: idx + 1 }));

      setProducts(prev => prev.map(p => reordered.find(rp => rp.id === p.id) || p));

      if (db && user && user.uid !== 'demo_user') {
        const batch = writeBatch(db);
        reordered.forEach(p => {
          batch.update(doc(db, 'artifacts', appId, 'shop', 'main', 'products', p.id), { order: p.order });
        });
        batch.commit().catch(err => console.error('Failed to save new order:', err));
      }
    };

    useEffect(() => {
      if (!dragState) return;

      const handlePointerMove = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const rowEl = el && el.closest('[data-row-id]');
        if (rowEl) {
          const overId = rowEl.getAttribute('data-row-id');
          setDragState(prev => (prev && prev.overId !== overId) ? { ...prev, overId } : prev);
        }
      };

      const handlePointerUp = () => {
        setDragState(current => {
          if (current) commitReorder(current.categoryId, current.draggedId, current.overId);
          return null;
        });
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }, [dragState, products]);

    const renderProductRow = (p, categoryId, draggable = true) => (
      <div
        key={p.id}
        data-row-id={p.id}
        className={`flex items-center gap-3 p-3 transition-colors ${
          dragState?.draggedId === p.id ? 'opacity-40' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/50 dark:hover:bg-slate-900/50'
        }`}
      >
        {draggable ? (
          <button
            onPointerDown={(e) => { e.preventDefault(); setDragState({ categoryId, draggedId: p.id, overId: p.id }); }}
            className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 touch-none shrink-0"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>
        ) : (
          <div className="w-[30px] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm whitespace-pre-line leading-snug">{p.name}</p>
        </div>
        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
          ₱{Number(p.price).toFixed(2)} <span className="text-slate-400 dark:text-slate-400 font-normal text-xs">/ {p.unit}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditProd(p)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Edit">
            <Edit size={16}/>
          </button>
          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
            <Trash2 size={16}/>
          </button>
        </div>
      </div>
    );

    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Catalog & Service Settings</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage printing services, prices, images, and category sorting</p>
            </div>
            
            {/* Sub-tab Navigation */}
            <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
              <button 
                onClick={() => setActiveSettingsTab('services')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeSettingsTab === 'services' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white dark:text-white'
                }`}
              >
                Services Catalog ({products.length})
              </button>
              <button 
                onClick={() => setActiveSettingsTab('categories')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeSettingsTab === 'categories' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white dark:text-white'
                }`}
              >
                Categories ({categories.length})
              </button>
              <button 
                onClick={() => setActiveSettingsTab('appearance')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeSettingsTab === 'appearance' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white dark:text-white'
                }`}
              >
                Appearance
              </button>
            </div>
          </div>

          {activeSettingsTab === 'services' ? (
            <>
              {/* Product Add / Edit Form */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                  {editProd ? 'Edit Service' : 'Add New Printing Service'}
                </h3>
                <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Service Title (use \n for newline)</label>
                    <input 
                      name="name" 
                      defaultValue={editProd?.name} 
                      required 
                      placeholder="e.g. Black & White\n(Text Only)"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                    <select 
                      name="categoryId" 
                      defaultValue={editProd?.categoryId || categories[0]?.id} 
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Price (₱)</label>
                    <input 
                      name="price" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editProd?.price} 
                      required 
                      placeholder="0.00"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Billing Unit (e.g., page, pc, set)</label>
                    <input 
                      name="unit" 
                      defaultValue={editProd?.unit || 'page'} 
                      required 
                      placeholder="page"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Image URL (Optional)</label>
                    <input 
                      name="imageUrl" 
                      defaultValue={editProd?.imageUrl} 
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
                    {editProd && (
                      <button 
                        type="button" 
                        onClick={() => setEditProd(null)} 
                        className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-950 font-bold text-sm transition-colors"
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

              {/* Products List, grouped by Category */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Current Services List</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center">
                    <GripVertical size={14} className="mr-1"/> Drag to reorder within a category
                  </span>
                </div>

                {categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => {
                  const catProducts = getCategoryProducts(cat.id);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.id} className="mb-8 last:mb-0">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{cat.name}</h4>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                          {catProducts.length} service{catProducts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                        {catProducts.map(p => renderProductRow(p, cat.id, true))}
                      </div>
                    </div>
                  );
                })}

                {(() => {
                  const orphans = products.filter(p => !categories.some(c => c.id === p.categoryId));
                  if (orphans.length === 0) return null;
                  return (
                    <div className="mb-8 last:mb-0">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">Unassigned</h4>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                          {orphans.length} service{orphans.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                        {orphans.map(p => renderProductRow(p, null, false))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            /* Category Management Tab */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{editCat ? 'Edit Category' : 'Add Category'}</h3>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category Name</label>
                    <input 
                      name="name" 
                      defaultValue={editCat?.name} 
                      required 
                      placeholder="e.g. Stickers & Labels"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Icon Style</label>
                    <select 
                      name="icon" 
                      defaultValue={editCat?.icon || 'file'} 
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                        className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 text-sm font-bold"
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

              <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100">Categories List</div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs uppercase font-bold text-slate-400 dark:text-slate-400 bg-slate-50/50">
                      <th className="p-4">Icon</th>
                      <th className="p-4">Category Name</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors text-sm">
                        <td className="p-4 text-slate-600 dark:text-slate-300">{getCategoryIcon(c.icon)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setEditCat(c)} 
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg"
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

          {activeSettingsTab === 'appearance' && (
            <div className="space-y-6 max-w-xl">
              {/* Branding Settings */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Branding</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Your system name and logo appear on the sign-in screen, the sidebar, and on receipts.</p>

                {/* System Name */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">System Name</label>
                  <input
                    type="text"
                    value={draftSystemName}
                    onChange={(e) => setDraftSystemName(e.target.value)}
                    placeholder={DEFAULT_SYSTEM_NAME}
                    maxLength={40}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-900">
                      {draftLogoUrl ? (
                        <img src={draftLogoUrl} alt="Logo preview" className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <Printer size={28} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={logoInputRef}
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current && logoInputRef.current.click()}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200"
                      >
                        <Upload size={14} className="mr-1.5" /> {draftLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      {draftLogoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={14} className="mr-1.5" /> Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                  {logoError && <p className="text-xs font-semibold text-red-600 mt-2">{logoError}</p>}
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-3">
                    Recommended: a square image, at least 256×256px (1:1 ratio), PNG with a transparent background works best. It's automatically resized after upload.
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSaveBranding}
                    disabled={!brandingDirty || savingBranding}
                    className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200"
                  >
                    <CheckCircle size={14} className="mr-1.5" /> {savingBranding ? 'Saving...' : 'Save Branding'}
                  </button>
                  {brandingSaved && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Saved
                    </span>
                  )}
                  {!brandingSaved && brandingDirty && (
                    <span className="text-xs font-semibold text-amber-600">Unsaved changes</span>
                  )}
                </div>
              </div>

              {/* Dark Mode */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Dark Mode</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Switch the whole system to a darker color scheme. Your choice is remembered on this device.</p>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{darkMode ? 'Dark mode is on' : 'Dark mode is off'}</span>
                  <button
                    onClick={() => setDarkMode(d => !d)}
                    aria-pressed={darkMode}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-800 shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
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
      const headers = ["Order ID", "Date", "Time", "Customer Name", "Items Purchased", "Subtotal (PHP)", "Additional Charge (PHP)", "Additional Charge Note", "Total Amount (PHP)"];
      const rows = filteredOrders.map(o => [
        `"${o.id}"`,
        `"${new Date(o.timestamp).toLocaleDateString()}"`,
        `"${new Date(o.timestamp).toLocaleTimeString()}"`,
        `"${(o.customerName || 'N/A').replace(/"/g, '""')}"`,
        `"${(o.items || []).map(i => `${i.qty}x ${i.name.replace(/\n/g, ' ')}${i.isLongSize ? ' [Long Paper]' : ''}`).join('; ')}"`,
        (o.subtotal || 0).toFixed(2),
        (o.additionalCharge || 0).toFixed(2),
        `"${(o.additionalChargeNote || '').replace(/"/g, '""')}"`,
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

    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState(null); // { type: 'success' | 'error', text }

    const parseItemsText = (text) => {
      if (!text || !String(text).trim()) {
        return [{ id: 'imported', name: 'Imported Sale', price: 0, qty: 1, isLongSize: false }];
      }
      const parts = String(text).split(';').map(s => s.trim()).filter(Boolean);
      const items = parts.map(part => {
        const isLongSize = /\[Long Paper\]/i.test(part);
        const clean = part.replace(/\[Long Paper\]/i, '').trim();
        const qtyMatch = clean.match(/^(\d+)\s*x\s*(.+)$/i);
        return qtyMatch
          ? { id: 'imported', name: qtyMatch[2].trim(), price: 0, qty: parseInt(qtyMatch[1], 10) || 1, isLongSize }
          : { id: 'imported', name: clean || 'Imported Item', price: 0, qty: 1, isLongSize };
      });
      return items.length ? items : [{ id: 'imported', name: 'Imported Sale', price: 0, qty: 1, isLongSize: false }];
    };

    const parseAmount = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? 0 : n;
    };

    const parseDateValue = (val) => {
      if (!val) return Date.now();
      const d = new Date(val);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    // Case/spacing-insensitive column lookup so slightly different headers still work
    const findCol = (row, candidates) => {
      const keys = Object.keys(row);
      for (const cand of candidates) {
        const key = keys.find(k => k.trim().toLowerCase() === cand);
        if (key !== undefined && row[key] !== undefined) return row[key];
      }
      return undefined;
    };

    const handleImportCSV = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setImporting(true);
      setImportMessage(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data || [];
            if (rows.length === 0) {
              setImportMessage({ type: 'error', text: 'No rows found in that CSV.' });
              setImporting(false);
              return;
            }

            const newOrders = rows.map(row => {
              const dateVal = findCol(row, ['date', 'order date']);
              const timeVal = findCol(row, ['time']);
              const combinedDate = timeVal ? `${dateVal} ${timeVal}` : dateVal;
              const customer = findCol(row, ['customer name', 'customer']);
              const itemsText = findCol(row, ['items purchased', 'items']);

              const subtotal = parseAmount(findCol(row, ['subtotal (php)', 'subtotal']));
              const additionalCharge = parseAmount(findCol(row, ['additional charge (php)', 'additional charge']));
              const chargeNote = findCol(row, ['additional charge note', 'charge note']);
              const total = parseAmount(findCol(row, ['total amount (php)', 'total']));

              const finalTotal = total || (subtotal + additionalCharge);
              const finalSubtotal = subtotal || Math.max(finalTotal - additionalCharge, 0);

              return {
                items: parseItemsText(itemsText),
                subtotal: finalSubtotal,
                additionalCharge: additionalCharge || 0,
                additionalChargeNote: additionalCharge > 0 && chargeNote ? String(chargeNote).trim() : '',
                total: finalTotal,
                customerName: (customer && String(customer).trim()) || 'Walk-in Customer',
                timestamp: parseDateValue(combinedDate),
                importedAt: Date.now(),
              };
            }).filter(o => o.total > 0 || o.subtotal > 0);

            if (newOrders.length === 0) {
              setImportMessage({ type: 'error', text: "Couldn't find any valid sales rows. Check that your columns include at least a Date and a Total." });
              setImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
              return;
            }

            if (db && user && user.uid !== 'demo_user') {
              const batch = writeBatch(db);
              const ordersCol = collection(db, 'artifacts', appId, 'shop', 'main', 'orders');
              newOrders.forEach(o => {
                const ref = doc(ordersCol);
                batch.set(ref, o);
              });
              await batch.commit();
            } else {
              setOrders(prev => [
                ...prev,
                ...newOrders.map(o => ({ ...o, id: 'imported_' + Date.now() + '_' + Math.random().toString(36).slice(2) }))
              ]);
            }

            setImportMessage({ type: 'success', text: `Imported ${newOrders.length} sale${newOrders.length === 1 ? '' : 's'} — metrics below now include ${newOrders.length === 1 ? 'it' : 'them'}.` });
          } catch (err) {
            console.error('CSV import error:', err);
            setImportMessage({ type: 'error', text: 'Something went wrong reading that file. Please check its format and try again.' });
          } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        },
        error: (err) => {
          console.error('CSV parse error:', err);
          setImportMessage({ type: 'error', text: 'Could not parse that file as CSV.' });
          setImporting(false);
        }
      });
    };

    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Sales Reports & Analytics</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Overview of daily, monthly, and custom date range revenue</p>
          </div>

          {importMessage && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-semibold flex items-start justify-between gap-3 ${
              importMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span>{importMessage.text}</span>
              <button onClick={() => setImportMessage(null)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Sales Today</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">₱{salesToday.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 border-y border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Yesterday's Sales</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">₱{salesYesterday.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-purple-500 border-y border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">This Month's Sales</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">₱{salesMonth.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-amber-500 border-y border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Year-to-Date Sales</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">₱{salesYear.toFixed(2)}</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center mb-3">
                  <Calendar size={18} className="mr-2 text-blue-600 dark:text-blue-400" />
                  Select Custom Date Range
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" 
                    />
                  </div>
                  <span className="text-slate-400 dark:text-slate-400 font-bold self-end pb-3">to</span>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" 
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="self-end mb-1 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-red-100 flex items-center"
                    >
                      <RefreshCw size={14} className="mr-1"/> Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex flex-col justify-center min-w-[240px]">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {startDate || endDate ? 'Filtered Range Total' : 'Total Revenue (All Time)'}
                </p>
                <p className="text-3xl font-black text-blue-900 mt-1">₱{rangeTotal.toFixed(2)}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{filteredOrders.length} transaction(s) found</p>
              </div>
            </div>
          </div>

          {/* Detailed History Table with Download CSV Button */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b bg-slate-50 dark:bg-slate-900 flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Sales Transactions History</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{filteredOrders.length} records</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={importing}
                  title="Columns: Date, Customer Name, Subtotal, Additional Charge, Total"
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Upload size={14} className="mr-1.5" /> {importing ? 'Importing…' : 'Import CSV'}
                </button>
                <button 
                  onClick={handleDownloadCSV}
                  disabled={filteredOrders.length === 0}
                  className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Download size={14} className="mr-1.5" /> Download CSV
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-400">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="font-semibold text-slate-600 dark:text-slate-300">No transactions match the selected date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b text-xs uppercase font-bold text-slate-400 dark:text-slate-400 bg-slate-50/50">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4 w-1/3">Items Summary</th>
                      <th className="p-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="border-b hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors text-sm">
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                          {new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="text-xs text-slate-400 dark:text-slate-400 block">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-400 dark:text-slate-400">{o.id.slice(-6).toUpperCase()}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{o.customerName || 'N/A'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {o.items?.map((item, idx) => {
                          const unitP = Number(item.price) + ((item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && item.isLongSize ? 2.0 : 0);
                          return (
                            <div key={idx} className="truncate text-xs py-0.5">
                              • {item.qty}x {item.name.replace('\n', ' ')}
                              {item.isLongSize && <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">[Long Paper]</span>}
                              <span className="text-slate-400 dark:text-slate-400 font-normal ml-1">(₱{unitP.toFixed(2)})</span>
                            </div>
                          );
                        })}
                        {o.additionalCharge > 0 && (
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            + {o.additionalChargeNote ? o.additionalChargeNote : 'Extra Charge'}: ₱{Number(o.additionalCharge).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 dark:text-white text-base">₱{(o.total || 0).toFixed(2)}</td>
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
    <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Completed Orders</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">View, edit, or remove past sales records</p>
          </div>
          <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-full text-xs">
            {orders.length} Total Sales
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">No orders recorded yet.</p>
              <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Complete sales from the POS terminal to see transactions here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b text-xs uppercase font-bold text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4 w-1/3">Order Breakdown</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors text-sm">
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(o.timestamp).toLocaleDateString()}
                        <span className="text-xs text-slate-400 dark:text-slate-400 block">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        <span className="flex items-center">
                          <User size={14} className="mr-1.5 text-slate-400 dark:text-slate-400" />
                          {o.customerName || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <div className="space-y-1">
                          {o.items?.map((item, idx) => {
                            const unitP = Number(item.price) + ((item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && item.isLongSize ? 2.0 : 0);
                            return (
                              <div key={idx} className="text-xs flex justify-between pr-4">
                                <span>• {item.qty}x {item.name.replace('\n', ' ')} {item.isLongSize && <span className="text-blue-600 dark:text-blue-400 font-semibold">[Long]</span>}</span>
                                <span className="text-slate-400 dark:text-slate-400">(₱{unitP.toFixed(2)})</span>
                              </div>
                            );
                          })}
                          {o.additionalCharge > 0 && (
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 pt-0.5">
                              + {o.additionalChargeNote ? o.additionalChargeNote : 'Additional'}: ₱{Number(o.additionalCharge).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 dark:text-white text-lg">₱{(o.total || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => setViewingOrder(o)} 
                            className="flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-bold border border-slate-200 dark:border-slate-700"
                          >
                            <FileText size={14} className="mr-1"/> View
                          </button>
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
    <div className="flex h-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Main Catalog Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Search Bar */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center shadow-sm z-10">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search product or service... (e.g. A4, photo, laminate)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all"
            />
          </div>
        </div>

        {/* Categories Ribbon */}
        <div className="flex p-4 gap-3 overflow-x-auto bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 scrollbar-hide">
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              className={`flex flex-col items-center justify-center min-w-[105px] py-3.5 px-3 rounded-2xl font-bold transition-all duration-200 ${
                activeCategory === cat.id && !searchQuery
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 border-transparent scale-105' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white dark:text-white'
              }`}
            >
              <div className={activeCategory === cat.id && !searchQuery ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                {getCategoryIcon(cat.icon)}
              </div>
              <span className="text-xs mt-1">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 py-16">
              <Printer size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-bold text-slate-600 dark:text-slate-300 text-lg">No services found</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Try selecting another category or clearing your search filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Service Preview Icon or Custom Image - 1:1 Square Container */}
                    <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center border border-slate-100 dark:border-slate-800 overflow-hidden group-hover:bg-blue-50/50 transition-colors">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex flex-col items-center">
                          {getCategoryIcon(categories.find(c => c.id === product.categoryId)?.icon)}
                        </div>
                      )}
                    </div>

                    {/* Service Title */}
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug whitespace-pre-line group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  {/* Price & Quick Add Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-semibold uppercase tracking-wider">Price</span>
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        ₱{Number(product.price).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal ml-0.5">/{product.unit}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white flex items-center justify-center transition-all shadow-sm"
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
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[88vh] bg-white dark:bg-slate-800 shadow-2xl flex flex-col rounded-t-3xl transform transition-transform duration-200 ease-in-out
          lg:static lg:z-20 lg:max-h-none lg:rounded-none lg:translate-y-0 lg:w-[380px] xl:w-[440px] lg:border-l lg:border-slate-200 dark:border-slate-700
          ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle (mobile/tablet only) */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center">
            {editingOrderId ? (
              <><Edit size={18} className="mr-2 text-blue-600 dark:text-blue-400"/> Editing Order</>
            ) : (
              'Current Order'
            )}
          </h2>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button 
                onClick={clearCart} 
                className="flex items-center px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-red-100"
              >
                <Trash2 size={14} className="mr-1"/> Clear All
              </button>
            )}
            <button
              onClick={() => setCartOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-400">
               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-950 rounded-full flex items-center justify-center mb-3">
                 <Printer size={32} className="text-slate-300 dark:text-slate-600" />
               </div>
               <p className="font-bold text-slate-600 dark:text-slate-300">Cart is empty</p>
               <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Select items from catalog to begin</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="flex items-center text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 px-1">
                <div className="flex-1">Item</div>
                <div className="w-20 text-center">Qty</div>
                <div className="w-14 text-right">Price</div>
                <div className="w-16 text-right">Total</div>
              </div>

              {cart.map(item => {
                const itemUnitPrice = getItemUnitPrice(item);
                const itemTotal = getItemTotal(item);
                return (
                  <div key={item.lineId} className="py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 rounded-xl px-1 transition-colors">
                    <div className="flex items-center gap-2.5 text-xs">
                      {/* Compact Item Square Image Thumbnail */}
                      <div className="w-9 h-9 aspect-square rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="text-slate-300 dark:text-slate-600" size={16} />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 whitespace-pre-line leading-snug text-xs">{item.name}</p>
                        
                        {/* Long Size Paper Option Checkbox */}
                        {(item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy') && (
                          <label className="mt-1 flex items-center space-x-1 cursor-pointer text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                            <input 
                              type="checkbox"
                              checked={!!item.isLongSize}
                              onChange={() => toggleCartItemLongSize(item.lineId)}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            />
                            <span>Long size <span className="text-blue-600 dark:text-blue-400 font-medium">(+₱2.00)</span></span>
                          </label>
                        )}
                      </div>
                      
                      {/* Quantity Selector */}
                      <div className="w-20 flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm flex-shrink-0">
                        <button onClick={() => updateCartQty(item.lineId, -1)} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-950 rounded"><Minus size={12}/></button>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.lineId, 1)} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-950 rounded"><Plus size={12}/></button>
                      </div>
                      
                      {/* Price per unit */}
                      <div className="w-14 text-right text-slate-500 dark:text-slate-400 font-medium text-xs flex-shrink-0">₱{itemUnitPrice.toFixed(2)}</div>
                      
                      {/* Total Price & Delete Action */}
                      <div className="w-16 flex items-center justify-end font-black text-slate-900 dark:text-white text-xs flex-shrink-0">
                        <span>₱{itemTotal.toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.lineId)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 ml-1 p-0.5">
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
        <div className="p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg space-y-3.5">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Subtotal</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">₱{cartSubtotal.toFixed(2)}</span>
          </div>

          {/* Additional Charge */}
          <div className="flex justify-between items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">Additional Charge</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 font-bold">₱</span>
              <input 
                type="number" 
                placeholder="0.00" 
                value={additionalChargeInput}
                onChange={handleAdditionalChargeChange}
                className="w-24 p-1.5 pl-6 text-right border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Optional note for the additional charge (only when a charge is entered) */}
          {totalAdditionalCharge > 0 && (
            <div className="-mt-1.5">
              <input
                type="text"
                list="charge-note-suggestions"
                placeholder="Description (optional) e.g. Photo Enhancements Fee"
                value={additionalChargeNote}
                onChange={handleAdditionalChargeNoteChange}
                maxLength={60}
                className="w-full p-1.5 px-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="charge-note-suggestions">
                <option value="Editing / Formatting Fee" />
                <option value="Photo Enhancements Fee" />
                <option value="Special Paper" />
              </datalist>
            </div>
          )}

          {/* REQUIRED Customer Name Input */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
              <span>Customer Name <span className="text-red-500">*</span></span>
              {!customerName.trim() && cart.length > 0 && (
                <span className="text-[10px] text-red-500 font-semibold">Required</span>
              )}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Enter customer name..." 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full p-2 pl-8 text-xs border rounded-xl outline-none transition-all ${
                  !customerName.trim() && cart.length > 0 
                    ? 'border-red-300 bg-red-50 dark:bg-red-950/40 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'
                }`}
                required
              />
            </div>
          </div>

          {/* Editable Date & Time - only shown when editing an existing order */}
          {editingOrderId && (
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center">
                <Calendar size={12} className="mr-1.5 text-slate-400 dark:text-slate-400" /> Order Date & Time
              </label>
              <input
                type="datetime-local"
                value={editDateTimeInput}
                onChange={(e) => setEditDateTimeInput(e.target.value)}
                className="w-full p-2 pl-3 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Changes where this order appears in Sales History and Reports.</p>
            </div>
          )}

          {/* Final Total */}
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
            <span className="text-xl font-black text-slate-900 dark:text-white">Total</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₱{cartTotal.toFixed(2)}</span>
          </div>

          {/* Checkout Action Button */}
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || !customerName.trim()}
            className={`w-full py-3.5 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 shadow-md ${
              (cart.length === 0 || !customerName.trim()) 
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400 cursor-not-allowed shadow-none' 
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
    <div className="flex h-screen bg-slate-900 font-sans text-slate-800 dark:text-slate-100">
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
          <div className="flex items-center min-w-0">
            <BrandLogo logoUrl={logoUrl} size={40} iconSize={22} className="mr-3" />
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight leading-none text-white truncate">{systemName}</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 font-semibold tracking-wider uppercase">Print • Copy • Scan</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 dark:text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button 
            onClick={() => { setActiveView('pos'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'pos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 dark:text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className="mr-3" size={18} /> POS Terminal
          </button>
          
          <button 
            onClick={() => { setActiveView('orders'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 dark:text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="mr-3" size={18} /> Orders
          </button>
          
          <button 
            onClick={() => { setActiveView('reports'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 dark:text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart2 className="mr-3" size={18} /> Reports
          </button>
          
          <button 
            onClick={() => { setActiveView('settings'); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeView === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 dark:text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="mr-3" size={18} /> Settings
          </button>
        </nav>

        {/* Signed-in staff + logout */}
        {auth && user && user.email && (
          <div className="px-6 pt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 border-t border-slate-800">
            <span className="truncate flex items-center"><User size={12} className="mr-1.5 shrink-0" />{user.email}</span>
            <button onClick={handleLogout} className="ml-2 shrink-0 font-bold text-slate-400 dark:text-slate-400 hover:text-white transition-colors">
              Log out
            </button>
          </div>
        )}

        {/* Footer Slogan */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
           <div className="text-slate-400 dark:text-slate-400 mb-3 opacity-70">
             <p className="text-sm font-bold italic">Quality Prints.</p>
             <p className="text-sm font-bold italic ml-3 text-blue-400">Every Time!</p>
           </div>
           <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
             <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></div>
             Inksurge System Online
           </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Mobile/tablet top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-md z-20 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Open menu"
          >
            <AlignJustify size={22} />
          </button>
          <div className="flex items-center min-w-0">
            <BrandLogo logoUrl={logoUrl} size={22} iconSize={13} rounded="rounded-md" className="mr-2" />
            <span className="font-black text-sm tracking-tight truncate">{systemName}</span>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Delete Transaction?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Are you sure you want to delete order for <span className="font-bold text-slate-700 dark:text-slate-200">{orderToDelete.customerName || 'N/A'}</span> (₱{orderToDelete.total?.toFixed(2)})? This action cannot be undone.
            </p>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setOrderToDelete(null)} 
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-950 transition-colors"
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

      {/* Receipt View Modal */}
      {viewingOrder && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewingOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setViewingOrder(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>

            <div ref={receiptRef} className="p-6 text-slate-800 font-mono bg-white">
              {/* Shop Header */}
              <div className="flex flex-col items-center text-center mb-4">
                <BrandLogo logoUrl={logoUrl} size={48} iconSize={24} className="mb-2" />
                <h2 className="text-base font-black tracking-tight uppercase">{systemName}</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Print • Copy • Scan</p>
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-3"></div>

              {/* Order Meta */}
              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-bold">{new Date(viewingOrder.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-bold">{new Date(viewingOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-bold">{viewingOrder.customerName || 'Walk-in Customer'}</span>
                </div>
                {viewingOrder.id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID</span>
                    <span className="font-bold text-[10px] break-all text-right ml-4">{String(viewingOrder.id).slice(-10)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-3"></div>

              {/* Items */}
              <div className="text-xs space-y-2 mb-3">
                {(viewingOrder.items || []).map((item, idx) => {
                  const isDocOrCopy = item.categoryId === 'cat_doc' || item.categoryId === 'cat_copy';
                  const unitP = Number(item.price || 0) + (isDocOrCopy && item.isLongSize ? 2.0 : 0);
                  const lineTotal = unitP * (item.qty || 1);
                  return (
                    <div key={idx} className="flex justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold whitespace-pre-line leading-snug">{item.qty}x {(item.name || '').replace(/\n/g, ' ')}</p>
                        {item.isLongSize && <p className="text-blue-600 text-[10px] font-semibold">+ Long Size Paper</p>}
                      </div>
                      <span className="font-bold whitespace-nowrap">₱{lineTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-3"></div>

              {/* Totals */}
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">₱{(viewingOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {viewingOrder.additionalCharge > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 min-w-0 break-words">
                      {viewingOrder.additionalChargeNote ? viewingOrder.additionalChargeNote : 'Additional Charge'}
                    </span>
                    <span className="font-bold whitespace-nowrap">₱{Number(viewingOrder.additionalCharge).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-3"></div>

              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-sm uppercase tracking-wide">Total</span>
                <span className="font-black text-xl">₱{(viewingOrder.total || 0).toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-3"></div>

              {/* Footer */}
              <div className="text-center mt-4">
                <p className="text-xs font-bold text-slate-700">Thank you for your business!</p>
                <p className="text-[10px] text-blue-600 font-semibold italic mt-0.5">Quality Prints. Every Time!</p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-2">
              {receiptNotice && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
                  {receiptNotice}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadReceipt}
                  disabled={!!processingReceipt}
                  className="flex items-center justify-center py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-colors"
                >
                  <Download size={14} className="mr-1.5"/> {processingReceipt === 'download' ? 'Preparing…' : 'Download'}
                </button>
                <button
                  onClick={handleShareReceipt}
                  disabled={!!processingReceipt}
                  className="flex items-center justify-center py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-colors"
                >
                  <Share2 size={14} className="mr-1.5"/> {processingReceipt === 'share' ? 'Preparing…' : 'Share'}
                </button>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}