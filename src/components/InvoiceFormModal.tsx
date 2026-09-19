import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  User, 
  Calendar, 
  Percent, 
  DollarSign, 
  HelpCircle,
  Package,
  Users,
  Check,
  ChevronDown
} from 'lucide-react';
import { Invoice, InvoiceItem, CustomerRecord, ServiceItem } from '../types';
import { formatRupiah } from '../utils/formatters';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: any) => Promise<void>;
  editInvoice?: Invoice | null;
  defaultStaticQris?: string;
  customers?: CustomerRecord[];
  services?: ServiceItem[];
  preselectedCustomer?: CustomerRecord | null;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editInvoice,
  defaultStaticQris,
  customers = [],
  services = [],
  preselectedCustomer = null,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [staticQris, setStaticQris] = useState('');
  const [notes, setNotes] = useState('Terima kasih atas kerja samanya. Pembayaran dapat dilakukan dengan scan QRIS Dinamis terlampir.');
  const [paymentTerms, setPaymentTerms] = useState('Jatuh tempo pembayaran sesuai tanggal yang tertera.');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Jasa Pembuatan Sistem & Aplikasi Web', quantity: 1, price: 2500000, total: 2500000 },
  ]);

  const [taxPercent, setTaxPercent] = useState<number>(11); // 11% PPN
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  useEffect(() => {
    if (editInvoice) {
      setInvoiceNumber(editInvoice.invoiceNumber);
      setCustomerName(editInvoice.customer.name);
      setCustomerCompany(editInvoice.customer.company || '');
      setCustomerEmail(editInvoice.customer.email || '');
      setCustomerPhone(editInvoice.customer.phone || '');
      setCustomerAddress(editInvoice.customer.address || '');
      setDate(editInvoice.date);
      setDueDate(editInvoice.dueDate);
      setItems(editInvoice.items.length > 0 ? editInvoice.items : [
        { id: '1', description: '', quantity: 1, price: 0, total: 0 }
      ]);
      setTaxPercent(editInvoice.taxPercent ?? 11);
      setDiscountAmount(editInvoice.discountAmount ?? 0);
      setStaticQris(editInvoice.staticQris || defaultStaticQris || '');
      setNotes(editInvoice.notes || '');
      setPaymentTerms(editInvoice.paymentTerms || '');
    } else {
      // Reset for new invoice
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setDueDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setInvoiceNumber(`INV-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      
      if (preselectedCustomer) {
        setCustomerName(preselectedCustomer.name);
        setCustomerCompany(preselectedCustomer.company || '');
        setCustomerEmail(preselectedCustomer.email || '');
        setCustomerPhone(preselectedCustomer.phone || '628');
        setCustomerAddress(preselectedCustomer.address || '');
      } else {
        setCustomerName('');
        setCustomerCompany('');
        setCustomerEmail('');
        setCustomerPhone('628');
        setCustomerAddress('');
      }

      setItems([
        { id: '1', description: 'Layanan / Produk Utama', quantity: 1, price: 1500000, total: 1500000 },
      ]);
      setTaxPercent(11);
      setDiscountAmount(0);
      setStaticQris(defaultStaticQris || '');
    }
  }, [editInvoice, defaultStaticQris, preselectedCustomer, isOpen]);

  if (!isOpen) return null;

  // Auto-fill from customer selection
  const handleSelectCustomer = (c: CustomerRecord) => {
    setCustomerName(c.name);
    setCustomerCompany(c.company || '');
    setCustomerEmail(c.email || '');
    setCustomerPhone(c.phone || '628');
    setCustomerAddress(c.address || '');
    setShowCustomerDropdown(false);
  };

  // Add from service catalog
  const handleAddServiceToItems = (srv: ServiceItem) => {
    setItems((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        description: srv.name + (srv.description ? ` (${srv.description})` : ''),
        quantity: 1,
        price: srv.price,
        total: srv.price,
      },
    ]);
    setShowServicePicker(false);
  };

  // Item helpers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'price' ? Number(value) : item.price;
      item.total = Math.max(0, q * p);
    }
    
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', quantity: 1, price: 0, total: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Math totals
  const subtotal = items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const taxableAmount = Math.max(0, subtotal - (Number(discountAmount) || 0));
  const taxAmount = Math.round((taxableAmount * (Number(taxPercent) || 0)) / 100);
  const grandTotal = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Nama pelanggan wajib diisi');
      return;
    }

    if (items.length === 0 || !items.some(i => i.total > 0)) {
      setError('Invoice harus memiliki minimal satu item dengan nominal > 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceNumber,
        date,
        dueDate,
        customer: {
          name: customerName,
          company: customerCompany,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
        },
        items,
        subtotal,
        taxPercent,
        taxAmount,
        discountAmount,
        totalAmount: grandTotal,
        staticQris,
        notes,
        paymentTerms,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {editInvoice ? 'Edit Faktur Invoice' : 'Buat Invoice Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi rincian penagihan. QRIS dinamis akan otomatis di-generate sesuai total akhir.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Top Section: Invoice Number, Date, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Nomor Invoice
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tanggal Terbit
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Jatuh Tempo (Due Date)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Informasi Pelanggan (Client)</span>
              </h4>

              {/* Customer quick selector */}
              {customers.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Pilih dari Daftar Pelanggan</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showCustomerDropdown && (
                    <div className="absolute right-0 mt-1 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 py-1 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition flex flex-col"
                        >
                          <span className="font-bold text-slate-900">{c.name}</span>
                          {c.company && <span className="text-[10px] text-slate-500">{c.company}</span>}
                          {c.phone && <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Pelanggan *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Budi Gunawan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Perusahaan / Organisasi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PT Maju Bersama"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nomor WhatsApp (Untuk Notifikasi Otomatis)
                </label>
                <input
                  type="text"
                  placeholder="628123456789"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Pelanggan (Untuk Tagihan & Pengingat)
                </label>
                <input
                  type="email"
                  placeholder="budi@majubersama.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Jl. Gatot Subroto No. 20, Jakarta Selatan"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Item & Rincian Tagihan</span>
              </h4>

              <div className="flex items-center gap-2">
                {/* Choose from service catalog button */}
                {services.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowServicePicker(!showServicePicker)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Dari Daftar Jasa</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showServicePicker && (
                      <div className="absolute right-0 mt-1 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 py-1 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                          Pilih Layanan untuk Ditambahkan:
                        </div>
                        {services.map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => handleAddServiceToItems(srv)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{srv.name}</span>
                              <span className="text-[10px] text-slate-400">{srv.category}</span>
                            </div>
                            <span className="text-xs font-extrabold font-mono text-indigo-700">
                              {formatRupiah(srv.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Deskripsi layanan / produk..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-2 text-xs text-center rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        placeholder="Harga"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className="w-full px-2 py-2 text-xs text-right font-mono rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="w-32 text-right font-bold text-xs text-slate-900 font-mono py-2 px-1">
                      {formatRupiah(item.total)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">{formatRupiah(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  Diskon (Rp):
                </span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-28 px-2 py-1 text-xs text-right font-mono rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  PPN (%):
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-xs text-center rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Nominal PPN:</span>
                <span className="font-mono">{formatRupiah(taxAmount)}</span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Akhir:</span>
                <span className="text-blue-600 font-mono text-base">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Catatan untuk Pelanggan (Notes)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Syarat & Ketentuan Pembayaran (Terms)
              </label>
              <textarea
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{editInvoice ? 'Perbarui Invoice' : 'Terbitkan Invoice & Generate QRIS'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
