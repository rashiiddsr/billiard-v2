'use client';
import { useState, useEffect, useCallback } from 'react';
import { financeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Filter } from 'lucide-react';
import { formatRupiah, formatDate } from '@/lib/utils';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ category: '', date: new Date().toISOString().split('T')[0], amount: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const cats = ['Listrik', 'Air', 'Gaji', 'Bahan Baku', 'Perawatan', 'Transportasi', 'Lain-lain'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDate) { params.startDate = filterDate; params.endDate = filterDate + 'T23:59:59'; }
      const res = await financeApi.listExpenses(params);
      setExpenses(res.data || res);
    } finally { setLoading(false); }
  }, [filterDate]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm({ category: cats[0], date: new Date().toISOString().split('T')[0], amount: '', notes: '' }); setShowModal(true); };
  const openEdit = (e: any) => { setEditId(e.id); setForm({ category: e.category, date: e.date.split('T')[0], amount: e.amount, notes: e.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Jumlah tidak valid'); return; }
    setBusy(true);
    try {
      const data = { ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() };
      if (editId) { await financeApi.updateExpense(editId, data); toast.success('Pengeluaran diperbarui'); }
      else { await financeApi.createExpense(data); toast.success('Pengeluaran dicatat'); }
      setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try { await financeApi.deleteExpense(id); toast.success('Dihapus'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Pengeluaran</h1><p className="page-subtitle">Total: {formatRupiah(total)}</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Catat Pengeluaran</button>
      </div>
      <div className="card card-padded mb-4" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
        <input type="date" className="form-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 'auto' }} />
        {filterDate && <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Reset</button>}
      </div>
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Tanggal</th><th>Kategori</th><th>Jumlah</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
          : expenses.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Belum ada pengeluaran</td></tr>
          : expenses.map((e: any) => (
            <tr key={e.id}>
              <td style={{ fontSize: 12 }}>{formatDate(e.date)}</td>
              <td><span className="badge badge-neutral">{e.category}</span></td>
              <td style={{ fontWeight: 700 }}>{formatRupiah(e.amount)}</td>
              <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{e.notes || '—'}</td>
              <td><div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(e)}><Edit2 size={13} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(e.id)}><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}><h3 className="card-title">{editId ? 'Edit' : 'Catat'} Pengeluaran</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Tanggal</label><input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Jumlah (Rp)</label><input type="number" className="form-input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
              <div className="form-group"><label className="form-label">Catatan</label><input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opsional" /></div>
            </div>
            <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
