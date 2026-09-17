import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Tag, 
  Edit3, 
  Trash2, 
  X, 
  Layers, 
  Check, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ServiceItem } from '../types';
import { formatRupiah } from '../utils/formatters';

interface ServiceCatalogProps {
  services: ServiceItem[];
  onAddService: (service: Partial<ServiceItem>) => Promise<void>;
  onUpdateService: (id: string, service: Partial<ServiceItem>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  services,
  onAddService,
  onUpdateService,
  onDeleteService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Software Development');
  const [unit, setUnit] = useState('Proyek');
  const [price, setPrice] = useState<number>(1000000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const categories = Array.from(new Set(services.map((s) => s.category || 'Umum')));

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setCategory('Software Development');
    setUnit('Proyek');
    setPrice(1000000);
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: ServiceItem) => {
    setEditingService(s);
    setName(s.name);
    setCategory(s.category || 'Umum');
    setUnit(s.unit || 'Proyek');
    setPrice(s.price);
    setDescription(s.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama jasa wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingService) {
        await onUpdateService(editingService.id, {
          name,
          category,
          unit,
          price: Number(price),
          description,
        });
      } else {
        await onAddService({
          name,
          category,
          unit,
          price: Number(price),
          description,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan jasa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q);
    const matchCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchQuery && matchCategory;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              Katalog Produk & Jasa
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Daftar Jasa & Layanan
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Simpan daftar harga jasa dan item produk bisnis Anda. Saat membuat invoice, item dapat dimasukkan langsung tanpa perlu mengetik ulang tarif dan deskripsi.
          </p>
        </div>

        <button
          id="btn-add-service"
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jasa Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="search-service-input"
            type="text"
            placeholder="Cari nama jasa, kategori, atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">Tidak ada jasa yang ditemukan.</p>
            <button
              onClick={openAddModal}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jasa Sekarang</span>
            </button>
          </div>
        ) : (
          filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                    {srv.category || 'Layanan'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(srv)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Jasa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteService(srv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Jasa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 mt-2">
                  {srv.name}
                </h3>

                {srv.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {srv.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Tarif per {srv.unit}
                  </span>
                  <span className="text-base font-extrabold text-indigo-700 font-mono">
                    {formatRupiah(srv.price)}
                  </span>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                  /{srv.unit}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingService ? 'Edit Jasa / Produk' : 'Tambah Jasa Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Jasa / Layanan *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pembuatan Website & Aplikasi Web"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori Jasa
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Software Development"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Satuan Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. Proyek, Bulan, Jam, Paket"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tarif / Harga Satuan (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Preview: {formatRupiah(price || 0)}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Deskripsi Lengkap Jasa (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan cakupan pekerjaan atau item yang didapatkan klien..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Jasa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
