'use client';
import { useState, useEffect, useCallback } from 'react';
import { menuApi, stockApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Search, Boxes } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { asArray, formatRupiah } from '@/lib/utils';

interface MenuItem { id: string; sku: string; name: string; category: string; price: string; cost?: string; isActive: boolean; stock?: { qtyOnHand: number }; }
interface Category { id: string; name: string; skuPrefix: string; }

interface Props { canEdit?: boolean; }

export default function MenuPage({ canEdit = true }: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats]   = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', cost: '', isActive: true });
  const [busy, setBusy] = useState(false);
  const [stockItem, setStockItem] = useState<MenuItem | null>(null);
  const [stockMode, setStockMode] = useState<'RESTOCK' | 'REDUCTION' | 'ADJUSTMENT'>('RESTOCK');
  const [stockValue, setStockValue] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockBusy, setStockBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([menuApi.list({ search: search || undefined, category: catFilter || undefined }), menuApi.categories()]);
      setItems(asArray(mRes));
      setCats(asArray(cRes));
    } finally { setLoading(false); }
  }, [search, catFilter]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm({ name: '', category: cats[0]?.name || '', price: '', cost: '', isActive: true }); setShowModal(true); };
  const openEdit = (m: MenuItem) => { setEditId(m.id); setForm({ name: m.name, category: m.category, price: m.price, cost: m.cost || '', isActive: m.isActive }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error('Nama dan harga wajib diisi'); return; }
    setBusy(true);
    try {
      if (editId) { await menuApi.update(editId, { ...form, price: Number(form.price), cost: form.cost ? Number(form.cost) : undefined }); toast.success('Menu diperbarui'); }
      else { await menuApi.create({ ...form, price: Number(form.price), cost: form.cost ? Number(form.cost) : undefined }); toast.success('Menu ditambahkan'); }
      setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus menu ini?')) return;
    try { await menuApi.remove(id); toast.success('Menu dihapus'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
  };

  const openStockModal = (item: MenuItem) => {
    setStockItem(item);
    setStockMode('RESTOCK');
    setStockValue('');
    setStockNotes('');
  };

  const closeStockModal = () => {
    setStockItem(null);
    setStockMode('RESTOCK');
    setStockValue('');
    setStockNotes('');
  };

  const submitStockAdjustment = async () => {
    if (!stockItem) return;
    const amount = Number(stockValue);
    if (!amount || Number.isNaN(amount)) return toast.error('Nilai stok wajib diisi');
    if (!stockNotes.trim()) return toast.error('Catatan wajib diisi');

    const quantityDelta = stockMode === 'RESTOCK'
      ? Math.abs(amount)
      : stockMode === 'REDUCTION'
      ? -Math.abs(amount)
      : amount;
    if (quantityDelta === 0) return toast.error('Nilai penyesuaian tidak boleh 0');

    const actionType = stockMode === 'RESTOCK' ? 'RESTOCK' : 'MANUAL_ADJUSTMENT';
    setStockBusy(true);
    try {
      await stockApi.adjustStock(stockItem.id, {
        actionType,
        quantityDelta,
        notes: stockNotes.trim(),
      });
      toast.success('Stok berhasil diperbarui');
      closeStockModal();
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal update stok');
    } finally {
      setStockBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Menu F&B</h1><p className="page-subtitle">{items.length} item</p></div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah Menu</button>}
      </div>
      <div className="card card-padded mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input className="form-input" placeholder="Cari menu..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="">Semua Kategori</option>
          {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Harga Jual</th><th>HPP</th><th>Status</th>{canEdit && <th>Aksi</th>}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
              : items.length === 0 ? <tr><td colSpan={canEdit ? 7 : 6} className="table-empty-cell">Belum ada data untuk ditampilkan</td></tr>
              : items.map(m => (
                <tr key={m.id}>
                  <td><code style={{ fontSize: 11 }}>{m.sku}</code></td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>{m.category}</td>
                  <td>{formatRupiah(m.price)}</td>
                  <td>{m.cost ? formatRupiah(m.cost) : '—'}</td>
                  <td><span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>{m.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  {canEdit && <td><div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openStockModal(m)} title="Modifikasi stok"><Boxes size={13} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}><Edit2 size={13} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(m.id)}><Trash2 size={13} /></button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <ModalPortal>
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header"><h3 className="card-title">{editId ? 'Edit Menu' : 'Tambah Menu'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="modal-body">
              {(['name', 'price', 'cost'] as const).map(f => (
                <div key={f} className="form-group">
                  <label className="form-label">{f === 'name' ? 'Nama Menu' : f === 'price' ? 'Harga Jual (Rp)' : 'Harga Modal / HPP (opsional)'}</label>
                  <input type={f === 'name' ? 'text' : 'number'} className="form-input" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} placeholder={f === 'name' ? 'Nama menu' : '0'} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.isActive ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
      {stockItem && (
        <ModalPortal>
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3 className="card-title">Modifikasi Stok — {stockItem.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeStockModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Stok saat ini</label>
                <div style={{ fontWeight: 700 }}>{stockItem.stock?.qtyOnHand ?? 0}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Aksi *</label>
                <select className="form-select" value={stockMode} onChange={(e) => setStockMode(e.target.value as any)}>
                  <option value="RESTOCK">Restok</option>
                  <option value="REDUCTION">Pengurangan Manual</option>
                  <option value="ADJUSTMENT">Penyesuaian Manual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nilai *</label>
                <input
                  type="number"
                  className="form-input"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder={stockMode === 'ADJUSTMENT' ? 'contoh: -2 / 3' : 'contoh: 2'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="Wajib isi alasan perubahan stok"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeStockModal}>Batal</button>
              <button className="btn btn-primary" onClick={submitStockAdjustment} disabled={stockBusy}>
                {stockBusy ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
