'use client';
import { useState, useEffect } from 'react';
import { menuApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Cat { id: string; name: string; skuPrefix: string; lastSkuNumber: number; }

export default function Page() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [prefix, setPrefix] = useState(''); const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setCats(await menuApi.categories()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setName(''); setPrefix(''); setShowModal(true); };
  const openEdit = (c: Cat) => { setEditId(c.id); setName(c.name); setPrefix(c.skuPrefix); setShowModal(true); };

  const handleSave = async () => {
    if (!name.trim() || !prefix.trim()) { toast.error('Nama dan prefix wajib diisi'); return; }
    setBusy(true);
    try {
      if (editId) { await menuApi.updateCategory(editId, { name, skuPrefix: prefix.toUpperCase() }); toast.success('Kategori diperbarui'); }
      else { await menuApi.createCategory({ name, skuPrefix: prefix.toUpperCase() }); toast.success('Kategori dibuat'); }
      setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try { await menuApi.deleteCategory(id); toast.success('Kategori dihapus'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Kategori Menu</h1></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah</button></div>
      <div className="card"><div className="table-wrapper"><table className="data-table">
        <thead><tr><th>Nama</th><th>SKU Prefix</th><th>SKU Terakhir</th><th>Aksi</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
          : cats.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>{c.name}</td>
              <td><code className="badge badge-neutral">{c.skuPrefix}</code></td>
              <td>{c.lastSkuNumber}</td>
              <td><div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={13} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 380 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}><h3 className="card-title">{editId ? 'Edit Kategori' : 'Tambah Kategori'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">Nama Kategori</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">SKU Prefix (2-4 huruf)</label><input className="form-input" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} maxLength={4} placeholder="contoh: MKN" /></div>
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
