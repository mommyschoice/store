import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, Plus, Edit2, Trash2, LogOut, X, ChevronRight, ShoppingBag, Info, Package } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SpeedInsights } from '@vercel/speed-insights/react';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
interface SizeInfo {
  range: string;
  price: number;
  bodyLong: string;
  pantLong: string;
}

interface Dress {
  id: number;
  code: string;
  name: string;
  category: string;
  note: string;
  sizes: SizeInfo[];
  image_url: string;
}

// --- COMPONENTS ---

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-black z-10 transition-colors"
          >
            <X size={20} />
          </button>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const DressCard = ({ dress, onClick }: { dress: Dress; onClick: () => void }) => {
  const minPrice = Math.min(...dress.sizes.map(s => s.price));
  const maxPrice = Math.max(...dress.sizes.map(s => s.price));
  const priceDisplay = minPrice === maxPrice ? `${minPrice}tk` : `${minPrice}-${maxPrice}tk`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative mb-6 cursor-pointer overflow-hidden rounded-2xl bg-zinc-100"
      onClick={onClick}
    >
      <img
        src={dress.image_url}
        alt={dress.name}
        className="w-full transition-transform duration-500 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
        <p className="text-xs font-mono opacity-80">{dress.code}</p>
        <h3 className="font-semibold text-lg leading-tight">{dress.name}</h3>
        <p className="text-sm font-medium mt-1">{priceDisplay}</p>
      </div>
    </motion.div>
  );
};

// --- PAGES ---

const PublicFeed = () => {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDresses();
    fetchCategories();
  }, [selectedCategory, searchQuery]);

  const fetchDresses = async () => {
    try {
      const res = await fetch(`/api/dresses?category=${selectedCategory}&search=${searchQuery}`);
      const data = await res.json();
      setDresses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const breakpointColumns = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link to="/" className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <ShoppingBag className="text-black" />
            YUKI GALLERY
          </Link>
          
          <div className="flex flex-1 max-w-xl items-center gap-3 bg-zinc-100 rounded-full px-4 py-2">
            <Search size={18} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, code, or category..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Link to="/admin" className="text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
            Admin Access
          </Link>
        </div>

        {/* Categories */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                selectedCategory === cat 
                  ? "bg-black text-white shadow-lg shadow-black/20" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6 bg-clip-padding"
          >
            {dresses.map((dress) => (
              <div key={dress.id}>
                <DressCard dress={dress} onClick={() => setSelectedDress(dress)} />
              </div>
            ))}
          </Masonry>
        )}

        {!loading && dresses.length === 0 && (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-zinc-300 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900">No dresses found</h3>
            <p className="text-zinc-500">Try adjusting your search or category filter.</p>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedDress} onClose={() => setSelectedDress(null)}>
        {selectedDress && (
          <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
            <div className="md:w-1/2 bg-zinc-100">
              <img
                src={selectedDress.image_url}
                alt={selectedDress.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:w-1/2 p-8 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-block px-2 py-1 bg-zinc-100 rounded text-[10px] font-mono text-zinc-500">
                    {selectedDress.code}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{selectedDress.category}</span>
                </div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-1">{selectedDress.name}</h2>
              </div>

              <div className="space-y-6 flex-1">
                {selectedDress.note && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                      <Info size={14} /> Note
                    </h4>
                    <p className="text-zinc-600 text-sm italic">{selectedDress.note}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <Filter size={14} /> Size & Pricing
                  </h4>
                  <div className="overflow-hidden rounded-2xl border border-zinc-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-zinc-600">Size</th>
                          <th className="px-4 py-2 font-semibold text-zinc-600">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selectedDress.sizes.map((s, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-zinc-700">{s.range}</td>
                            <td className="px-4 py-2 font-bold text-zinc-900">{s.price}tk</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <Package size={14} /> Measurements
                  </h4>
                  <div className="space-y-3">
                    {selectedDress.sizes.map((s, idx) => (
                      <div key={idx} className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Size: {s.range}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Body Long</p>
                            <p className="text-sm font-medium">{s.bodyLong || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Pant/Skirt Long</p>
                            <p className="text-sm font-medium">{s.pantLong || '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                Inquire via WhatsApp <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl shadow-black/5"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin Portal</h1>
          <p className="text-zinc-500 mt-2">Enter your credentials to manage inventory</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">Username</label>
            <input
              type="text"
              className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">Password</label>
            <input
              type="password"
              className="w-full px-5 py-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 mt-4"
          >
            Sign In
          </button>
        </form>
        
        <Link to="/" className="block text-center mt-8 text-sm text-zinc-400 hover:text-black transition-colors">
          ← Back to Catalog
        </Link>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDress, setEditingDress] = useState<Dress | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    note: '',
    sizes: [] as SizeInfo[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) navigate('/admin');
    fetchDresses();
  }, []);

  const fetchDresses = async () => {
    const res = await fetch('/api/dresses');
    const data = await res.json();
    setDresses(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const addSizeRange = () => {
    setFormData({
      ...formData,
      sizes: [...formData.sizes, { range: '', price: 0, bodyLong: '', pantLong: '' }]
    });
  };

  const removeSizeRange = (index: number) => {
    const newSizes = [...formData.sizes];
    newSizes.splice(index, 1);
    setFormData({ ...formData, sizes: newSizes });
  };

  const updateSizeRange = (index: number, field: keyof SizeInfo, value: any) => {
    const newSizes = [...formData.sizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setFormData({ ...formData, sizes: newSizes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'sizes') data.append(key, JSON.stringify(value));
      else data.append(key, value as string);
    });
    if (imageFile) data.append('image', imageFile);

    const url = editingDress ? `/api/admin/dresses/${editingDress.id}` : '/api/admin/dresses';
    const method = editingDress ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: data,
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingDress(null);
        setFormData({ code: '', name: '', category: '', note: '', sizes: [] });
        setImageFile(null);
        fetchDresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dress?')) return;
    const token = localStorage.getItem('admin_token');
    await fetch(`/api/admin/dresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchDresses();
  };

  const openEdit = (dress: Dress) => {
    setEditingDress(dress);
    setFormData({
      code: dress.code,
      name: dress.name,
      category: dress.category,
      note: dress.note || '',
      sizes: dress.sizes,
    });
    setIsModalOpen(true);
  };

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Inventory Manager</h1>
            <span className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setEditingDress(null);
                setFormData({ code: '', name: '', category: '', note: '', sizes: [] });
                setIsModalOpen(true);
              }}
              className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <Plus size={18} /> Add Dress
            </button>
            <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Image</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Details</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Price Range</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {dresses.map((dress) => {
                const minPrice = Math.min(...dress.sizes.map(s => s.price));
                const maxPrice = Math.max(...dress.sizes.map(s => s.price));
                return (
                  <tr key={dress.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <img src={dress.image_url} className="w-16 h-20 object-cover rounded-lg" alt="" />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono text-zinc-400 mb-1">{dress.code}</p>
                      <p className="font-semibold text-zinc-900">{dress.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 rounded-full text-xs text-zinc-600">{dress.category}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {minPrice === maxPrice ? `${minPrice}tk` : `${minPrice}-${maxPrice}tk`}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(dress)} className="p-2 text-zinc-400 hover:text-black transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(dress.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dresses.length === 0 && (
            <div className="p-20 text-center">
              <Package size={48} className="mx-auto text-zinc-200 mb-4" />
              <p className="text-zinc-400">No inventory found. Add your first dress!</p>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-8 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">{editingDress ? 'Edit Dress' : 'Add New Dress'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Dress Code</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Category</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Summer, Evening"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Note (Optional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="e.g. Limited edition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">Size Ranges & Pricing</label>
                <button
                  type="button"
                  onClick={addSizeRange}
                  className="text-xs font-bold text-black flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Range
                </button>
              </div>
              <div className="space-y-4">
                {formData.sizes.map((s, idx) => (
                  <div key={idx} className="bg-zinc-50 p-4 rounded-2xl relative">
                    <button
                      type="button"
                      onClick={() => removeSizeRange(idx)}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Range (e.g. 22-26)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          value={s.range}
                          onChange={(e) => updateSizeRange(idx, 'range', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Price (tk)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          value={isNaN(s.price) ? '' : s.price}
                          onChange={(e) => updateSizeRange(idx, 'price', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Body Long</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          value={s.bodyLong}
                          onChange={(e) => updateSizeRange(idx, 'bodyLong', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Pant/Skirt Long</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          value={s.pantLong}
                          onChange={(e) => updateSizeRange(idx, 'pantLong', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Image</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                required={!editingDress}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
            >
              {editingDress ? 'Update Dress' : 'Save Dress'}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicFeed />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
      <SpeedInsights />
    </BrowserRouter>
  );
}
