'use client';
import { useState, useEffect, useCallback } from 'react';
import { tablesApi } from '@/lib/api';
import { asArray } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface Table { id: string; name: string; description?: string; hourlyRate: string; status: string; isActive: boolean; }

export default function OwnerTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [rate, setRate] = useState(''); const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { setTables(asArray(await tablesApi.list(true))); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = (t: Table) => { setEditId(t.id); setRate(t.hourlyRate); setActive(t.isActive); setShowModal(true); };

  const handleSave = async () => {
    if (!rate || Number(rate) < 0) { toast.error('Tarif tidak valid'); return; }
    setBusy(true);
    try {
      await tablesApi.update(editId!, { hourlyRate: Number(rate), isActive: active });
      toast.success('Meja diperbarui'); setShowModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const statusIcon = { AVAILABLE: <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />, OCCUPIED: <Clock size={13} style={{ color: 'var(--color-warning)' }} />, MAINTENANCE: <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} /> };
  const statusCls  = { AVAILABLE: 'badge-success', OCCUPIED: 'badge-warning', MAINTENANCE: 'badge-neutral' };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Kelola Meja</h1><p className="page-subtitle">Atur tarif dan status meja</p></div>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nama</th><th>Tarif/Jam</th><th>Status</th><th>Aktif</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
              : tables.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}{t.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.description}</div>}</td>
                  <td>{formatRupiah(t.hourlyRate)}</td>
                  <td><span className={`badge ${(statusCls as any)[t.status] || 'badge-neutral'}`} style={{ display: 'inline-flex', gap: 4 }}>{(statusIcon as any)[t.status]}{t.status}</span></td>
                  <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>{t.isActive ? 'Ya' : 'Tidak'}</span></td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(t)}><Edit2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 380 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}><h3 className="card-title">Edit Tarif Meja</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">Tarif per Jam (Rp)</label><input type="number" className="form-input" min={0} value={rate} onChange={e => setRate(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Status Aktif</label><select className="form-select" value={active ? 'true' : 'false'} onChange={e => setActive(e.target.value === 'true')}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
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
