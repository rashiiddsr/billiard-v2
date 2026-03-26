'use client';
import { useState, useEffect } from 'react';
import { packagesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { asArray, formatRupiah } from '@/lib/utils';

export default function PackagesPage() {
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name: '', price: '', durationMinutes: '60', targetHourlyRate: '', isActive: true });
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setPkgs(asArray(await packagesApi.list())); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ name: '', price: '', durationMinutes: '60', targetHourlyRate: '', isActive: true }); setShowModal(true); };
  const openEdit = (p: any) => { setEditId(p.id); setForm({ name: p.name, price: p.price, durationMinutes: String(p.durationMinutes || 60), targetHourlyRate: p.targetHourlyRate, isActive: p.isActive }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.targetHourlyRate) { toast.error('Semua field wajib diisi'); return; }
    setBusy(true);
    try {
      const data = { ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes), targetHourlyRate: Number(form.targetHourlyRate) };
      if (editId) { await packagesApi.update(editId, data); toast.success('Paket diperbarui'); }
      else { await packagesApi.create(data); toast.success('Paket dibuat'); }
      setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    try { await packagesApi.remove(id); toast.success('Paket dihapus'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Paket Billing</h1></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah Paket</button></div>
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Nama</th><th>Harga</th><th>Durasi</th><th>Tarif Target</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
          : pkgs.map(p => (
            <tr key={p.id}>
              <td style={{ fontWeight: 600 }}>{p.name}</td>
              <td style={{ fontWeight: 700 }}>{formatRupiah(p.price)}</td>
              <td>{p.durationMinutes ? `${p.durationMinutes / 60} jam` : '—'}</td>
              <td style={{ fontSize: 12 }}>{formatRupiah(p.targetHourlyRate)}/jam</td>
              <td><span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>{p.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
              <td><div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}><h3 className="card-title">{editId ? 'Edit' : 'Tambah'} Paket</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="card-body">
              {[['name','Nama Paket','text'],['price','Harga Paket (Rp)','number'],['durationMinutes','Durasi (menit)','number'],['targetHourlyRate','Tarif/Jam Target (Rp)','number']].map(([f,l,t]) => (
                <div key={f} className="form-group"><label className="form-label">{l}</label><input type={t} className="form-input" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} /></div>
              ))}
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.isActive ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
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
