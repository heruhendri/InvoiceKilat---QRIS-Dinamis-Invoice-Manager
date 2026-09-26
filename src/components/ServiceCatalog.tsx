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
  HelpCircle,
  Zap,
  Repeat,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ServiceItem, RecurringAddonService } from '../types';
import { formatRupiah } from '../utils/formatters';

interface ServiceCatalogProps {
  services: ServiceItem[];
  recurringAddons?: RecurringAddonService[];
  onSaveService?: (service: Partial<ServiceItem>) => Promise<void>;
  onAddService?: (service: Partial<ServiceItem>) => Promise<void>;
  onUpdateService?: (id: string, service: Partial<ServiceItem>) => Promise<void>;
  onDeleteService: (id: string) => void | Promise<void>;
  onSaveRecurringAddon?: (addon: Partial<RecurringAddonService>) => Promise<void>;
  onAddRecurringAddon?: (addon: Partial<RecurringAddonService>) => Promise<void>;
  onUpdateRecurringAddon?: (id: string, addon: Partial<RecurringAddonService>) => Promise<void>;
  onDeleteRecurringAddon?: (id: string) => void | Promise<void>;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  services,
  recurringAddons = [],
  onSaveService,
  onAddService,
  onUpdateService,
  onDeleteService,
  onSaveRecurringAddon,
  onAddRecurringAddon,
  onUpdateRecurringAddon,
  onDeleteRecurringAddon,
}) => {
  // Tabs: 'standard' (Jasa Satuan) vs 'recurring' (Layanan Tambahan Recurring)
  const [activeCatalogTab, setActiveCatalogTab] = useState<'standard' | 'recurring'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Standard Service Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Software Development');
  const [unit, setUnit] = useState('Proyek');
  const [price, setPrice] = useState<number>(1000000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Recurring Addon Modal State
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurringAddon, setEditingRecurringAddon] = useState<RecurringAddonService | null>(null);
  const [addonName, setAddonName] = useState('');
  const [addonCategory, setAddonCategory] = useState('Jaringan & VPN');
  const [addonPrice, setAddonPrice] = useState<number>(50000);
  const [addonUnit, setAddonUnit] = useState('Bulan');
  const [addonDescription, setAddonDescription] = useState('');
  const [addonEnabledByDefault, setAddonEnabledByDefault] = useState(true);
  const [isSubmittingRecurring, setIsSubmittingRecurring] = useState(false);
  const [recurringFormError, setRecurringFormError] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const standardCategories = Array.from(new Set(services.map((s) => s.category || 'Umum')));
  const recurringCategories = Array.from(new Set(recurringAddons.map((r) => r.category || 'Layanan Tambahan')));

  // Standard Service Handlers
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

  const handleSaveStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama jasa wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (onSaveService) {
        await onSaveService({
          ...(editingService ? { id: editingService.id } : {}),
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          price: Number(price),
          description: description.trim(),
        });
        setToastMessage(editingService ? `Jasa "${name.trim()}" berhasil diperbarui` : `Jasa baru "${name.trim()}" berhasil ditambahkan ke katalog`);
      } else if (editingService && onUpdateService) {
        await onUpdateService(editingService.id, {
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          price: Number(price),
          description: description.trim(),
        });
        setToastMessage(`Jasa "${name.trim()}" berhasil diperbarui`);
      } else if (onAddService) {
        await onAddService({
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          price: Number(price),
          description: description.trim(),
        });
        setToastMessage(`Jasa baru "${name.trim()}" berhasil ditambahkan ke katalog`);
      }
      setTimeout(() => setToastMessage(null), 3500);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan jasa');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recurring Addon Handlers
  const openAddRecurringModal = () => {
    setEditingRecurringAddon(null);
    setAddonName('');
    setAddonCategory('Jaringan & VPN');
    setAddonPrice(50000);
    setAddonUnit('Bulan');
    setAddonDescription('');
    setAddonEnabledByDefault(true);
    setRecurringFormError('');
    setIsRecurringModalOpen(true);
  };

  const openEditRecurringModal = (addon: RecurringAddonService) => {
    setEditingRecurringAddon(addon);
    setAddonName(addon.name);
    setAddonCategory(addon.category || 'Layanan Tambahan');
    setAddonPrice(addon.price);
    setAddonUnit(addon.unit || 'Bulan');
    setAddonDescription(addon.description || '');
    setAddonEnabledByDefault(addon.enabledByDefault ?? true);
    setRecurringFormError('');
    setIsRecurringModalOpen(true);
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonName.trim()) {
      setRecurringFormError('Nama layanan recurring wajib diisi');
      return;
    }

    setIsSubmittingRecurring(true);
    setRecurringFormError('');

    try {
      if (onSaveRecurringAddon) {
        await onSaveRecurringAddon({
          ...(editingRecurringAddon ? { id: editingRecurringAddon.id } : {}),
          name: addonName.trim(),
          category: addonCategory.trim(),
          price: Number(addonPrice),
          unit: addonUnit.trim(),
          description: addonDescription.trim(),
          enabledByDefault: addonEnabledByDefault,
        });
        setToastMessage(editingRecurringAddon ? `Layanan recurring "${addonName.trim()}" berhasil diperbarui` : `Layanan recurring baru "${addonName.trim()}" berhasil ditambahkan`);
      } else if (editingRecurringAddon && onUpdateRecurringAddon) {
        await onUpdateRecurringAddon(editingRecurringAddon.id, {
          name: addonName.trim(),
          category: addonCategory.trim(),
          price: Number(addonPrice),
          unit: addonUnit.trim(),
          description: addonDescription.trim(),
          enabledByDefault: addonEnabledByDefault,
        });
        setToastMessage(`Layanan recurring "${addonName.trim()}" berhasil diperbarui`);
      } else if (onAddRecurringAddon) {
        await onAddRecurringAddon({
          name: addonName.trim(),
          category: addonCategory.trim(),
          price: Number(addonPrice),
          unit: addonUnit.trim(),
          description: addonDescription.trim(),
          enabledByDefault: addonEnabledByDefault,
        });
        setToastMessage(`Layanan recurring baru "${addonName.trim()}" berhasil ditambahkan`);
      }
      setTimeout(() => setToastMessage(null), 3500);
      setIsRecurringModalOpen(false);
      setActiveCatalogTab('recurring');
    } catch (err: any) {
      setRecurringFormError(err.message || 'Gagal menyimpan layanan recurring');
    } finally {
      setIsSubmittingRecurring(false);
    }
  };

  const handleDeleteRecurring = async (addon: RecurringAddonService) => {
    if (!onDeleteRecurringAddon) return;
    try {
      await onDeleteRecurringAddon(addon.id);
      setToastMessage(`Layanan recurring "${addon.name}" berhasil dihapus`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus layanan recurring');
    }
  };

  // Filter lists
  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q);
    const matchCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchQuery && matchCategory;
  });

  const filteredRecurringAddons = recurringAddons.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q);
    const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchQuery && matchCategory;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              Katalog Produk & Jasa Bisnis
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-300" />
              Layanan Tambahan Recurring
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Katalog Jasa & Layanan Recurring
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Kelola daftar harga jasa standar per proyek serta <strong>Layanan Tambahan Recurring Bulanan</strong> (seperti VPN Remote Mikrotik, Biaya Monitoring Jaringan 24/7, Sewa IP Publik Dedicated, Maintenance) yang otomatis dapat disertakan pada invoice bulanan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-add-service"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jasa Satuan</span>
          </button>
          <button
            id="btn-add-recurring-addon"
            onClick={openAddRecurringModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/25 transition active:scale-95 shrink-0"
          >
            <Zap className="w-4 h-4 text-slate-950 fill-current" />
            <span>+ Tambah Recurring Custom</span>
          </button>
        </div>
      </div>

      {/* Catalog Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveCatalogTab('standard');
            setSelectedCategory('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeCatalogTab === 'standard'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Jasa & Produk Satuan</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeCatalogTab === 'standard' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {services.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveCatalogTab('recurring');
            setSelectedCategory('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeCatalogTab === 'recurring'
              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-600" />
          <span>Layanan Tambahan Recurring (Bulanan)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeCatalogTab === 'recurring' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {recurringAddons.length}
          </span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="search-service-input"
            type="text"
            placeholder={
              activeCatalogTab === 'standard'
                ? "Cari nama jasa satuan, kategori, atau deskripsi..."
                : "Cari layanan recurring (VPN, Monitoring, IP Publik, Maintenance)..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kategori
          </button>
          {(activeCatalogTab === 'standard' ? standardCategories : recurringCategories).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ================= VIEW 1: JASA SATUAN ================= */}
      {activeCatalogTab === 'standard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Tidak ada jasa satuan ditemukan.</p>
              <button
                onClick={openAddModal}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jasa Baru</span>
              </button>
            </div>
          ) : (
            filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      {service.category || 'Umum'}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditModal(service)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                        title="Edit Jasa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteService(service.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Hapus Jasa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm mb-1.5 leading-snug">
                    {service.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {service.description || 'Tidak ada deskripsi rinci untuk jasa ini.'}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Satuan: <strong className="text-slate-700">{service.unit || 'Item'}</strong>
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-600 font-mono">
                      {formatRupiah(service.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= VIEW 2: LAYANAN TAMBAHAN RECURRING (BULANAN) ================= */}
      {activeCatalogTab === 'recurring' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  Katalog Layanan Tambahan Recurring (Add-On Bulanan)
                </h4>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  Layanan di bawah ini dapat dipilih per-pelanggan di <strong>Daftar Pelanggan</strong> atau di-include secara massal saat generate faktur di <strong>Pusat Otomasi Tagihan Bulanan</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={openAddRecurringModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Layanan Recurring Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecurringAddons.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="text-sm font-semibold text-slate-700">Belum ada layanan tambahan recurring.</p>
                <p className="text-xs text-slate-400 mt-1">Tambahkan VPN Remote, Monitoring NOC, IP Dedicated, dsb.</p>
                <button
                  onClick={openAddRecurringModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-600 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Layanan Recurring Sekarang</span>
                </button>
              </div>
            ) : (
              filteredRecurringAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="bg-white rounded-2xl border border-amber-100 hover:border-amber-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle top indicator */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-indigo-500" />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Repeat className="w-3 h-3 text-amber-700" />
                        {addon.category || 'Recurring Add-On'}
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEditRecurringModal(addon)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-amber-50 transition"
                          title="Edit Layanan Recurring"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecurring(addon)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Hapus Layanan Recurring"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm mb-1.5 leading-snug">
                      {addon.name}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {addon.description || 'Layanan tambahan bulanan otomatis untuk klien.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {addon.enabledByDefault ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Default Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Opsional Klien
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-amber-700 font-mono">
                        {formatRupiah(addon.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        / {addon.unit || 'Bulan'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: ADD / EDIT JASA SATUAN ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingService ? 'Edit Jasa Satuan' : 'Tambah Jasa Satuan Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Produk atau pekerjaan per proyek / per satuan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStandard} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Jasa / Produk *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pembuatan Aplikasi Web, Desain Logo..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

      {/* ================= MODAL 2: ADD / EDIT LAYANAN RECURRING ================= */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRecurringAddon ? 'Edit Layanan Tambahan Recurring' : 'Tambah Layanan Tambahan Recurring'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Layanan bulanan berkala (VPN, Monitoring NOC, IP Publik, Maintenance)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="space-y-4">
              {recurringFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recurringFormError}</span>
                </div>
              )}

              {/* Quick Template Presets for Custom Recurring Addons */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Template Cepat atau Buat Custom:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('Sewa IP Public Dedicated');
                      setAddonCategory('Infrastruktur & IP');
                      setAddonPrice(150000);
                      setAddonUnit('IP / Bulan');
                      setAddonDescription('Alokasi IP Public statis IPv4 dedicated langsung ke router client untuk server atau CCTV.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition"
                  >
                    + Sewa IP Public (/30)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('Layanan VPN Remote Mikrotik Dedicated');
                      setAddonCategory('Jaringan & VPN');
                      setAddonPrice(50000);
                      setAddonUnit('Bulan');
                      setAddonDescription('Akses remote Winbox & Webfig Mikrotik via port forwarding VPN cloud tunnel 24/7.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold transition"
                  >
                    + VPN Remote Mikrotik
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('Biaya Monitoring Jaringan NOC 24/7');
                      setAddonCategory('Monitoring & SLA');
                      setAddonPrice(250000);
                      setAddonUnit('Bulan');
                      setAddonDescription('Pengawasan uptime link, ICMP alert, bandwidth peak alert via Telegram & NOC dashboard.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold transition"
                  >
                    + Monitoring NOC 24/7
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('Maintenance & Visit On-Site');
                      setAddonCategory('Maintenance');
                      setAddonPrice(500000);
                      setAddonUnit('Kunjungan / Bulan');
                      setAddonDescription('Layanan teknisi stand-by & perbaikan on-site ke lokasi fisik hingga 2x kunjungan.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold transition"
                  >
                    + On-Site Maintenance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('Auto Cloud Backup Router Mikrotik');
                      setAddonCategory('Cloud & Backup');
                      setAddonPrice(75000);
                      setAddonUnit('Router / Bulan');
                      setAddonDescription('Backup konfigurasi harian otomatis file .backup dan .rsc ke cloud storage terenkripsi.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold transition"
                  >
                    + Cloud Auto-Backup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddonName('');
                      setAddonCategory('Custom');
                      setAddonPrice(100000);
                      setAddonUnit('Bulan');
                      setAddonDescription('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                  >
                    Kosongkan Form
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Layanan Recurring Custom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                  placeholder="e.g. Sewa IP Publik Dedicated, Layanan VPN Tunnel, Monitoring NOC 24/7..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Kategori Layanan
                    </label>
                  </div>
                  <input
                    type="text"
                    value={addonCategory}
                    onChange={(e) => setAddonCategory(e.target.value)}
                    placeholder="e.g. Jaringan & VPN, Monitoring..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Jaringan & VPN', 'Monitoring & SLA', 'Infrastruktur & IP', 'Maintenance', 'Cloud & Backup'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAddonCategory(cat)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                          addonCategory === cat ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Satuan Periode
                    </label>
                  </div>
                  <input
                    type="text"
                    value={addonUnit}
                    onChange={(e) => setAddonUnit(e.target.value)}
                    placeholder="Bulan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Bulan', 'User / Bulan', 'Router / Bulan', 'IP / Bulan', 'Kunjungan'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setAddonUnit(u)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                          addonUnit === u ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block text-xs">
                    Tarif Bulanan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {[25000, 50000, 100000, 250000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setAddonPrice((prev) => (Number(prev) || 0) + inc)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition"
                      >
                        +{inc >= 1000 ? `${inc / 1000}k` : inc}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Preview: <strong className="text-amber-700 font-mono text-xs">{formatRupiah(addonPrice || 0)} / {addonUnit || 'Bulan'}</strong>
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Deskripsi Lengkap Layanan Recurring (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={addonDescription}
                  onChange={(e) => setAddonDescription(e.target.value)}
                  placeholder="Detail fasilitas, port forwarding, bandwidth tunnel, SLA dukungan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Default checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addonEnabledByDefault}
                  onChange={(e) => setAddonEnabledByDefault(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Sertakan Otomatis Secara Default pada Tagihan Bulanan Baru
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    Bila dicentang, layanan ini akan otomatis aktif sebagai baris item invoice saat membuat tagihan bulanan massal.
                  </span>
                </div>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecurring}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmittingRecurring ? 'Menyimpan...' : 'Simpan Layanan Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
