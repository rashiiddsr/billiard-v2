'use client';
import { useState, useEffect, useCallback } from 'react';
import { tablesApi } from '@/lib/api';
import { asArray, formatRupiah } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  description?: string;
  hourlyRate: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  isActive: boolean;
}

const statusOptions: Array<{ value: Table['status']; label: string }> = [
  { value: 'AVAILABLE', label: 'Tersedia' },
  { value: 'OCCUPIED', label: 'Terpakai' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

export default function OwnerTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState<Table['status']>('AVAILABLE');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTables(asArray(await tablesApi.list(true)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setRate('');
    setStatus('AVAILABLE');
    setActive(true);
  };

  const openCreate = () => {
    resetForm();
    setMode('create');
    setShowModal(true);
  };

  const openEdit = (t: Table) => {
    setMode('edit');
    setEditId(t.id);
    setName(t.name);
    setRate(t.hourlyRate);
    setStatus(t.status);
    setActive(t.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!rate || Number(rate) < 0) {
      toast.error('Tarif tidak valid');
      return;
    }
    if (mode === 'create' && !name.trim()) {
      toast.error('Nama meja wajib diisi');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'create') {
        await tablesApi.create({
          name: name.trim(),
          hourlyRate: Number(rate),
          status,
          isActive: active,
        });
        toast.success('Meja baru ditambahkan');
      } else {
        await tablesApi.update(editId!, { hourlyRate: Number(rate), isActive: active, status });
        toast.success('Meja diperbarui');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan meja');
    } finally {
      setBusy(false);
    }
  };

  const statusIcon = {
    AVAILABLE: <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />,
    OCCUPIED: <Clock size={13} style={{ color: 'var(--color-warning)' }} />,
    MAINTENANCE: <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />,
  };
  const statusCls = { AVAILABLE: 'badge-success', OCCUPIED: 'badge-warning', MAINTENANCE: 'badge-neutral' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Meja</h1>
          <p className="page-subtitle">Atur meja, tarif, dan status operasional</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Tambah Meja</button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className="card-title">{mode === 'create' ? 'Tambah Meja Baru' : 'Edit Meja'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="card-body">
              {mode === 'create' && (
                <div className="form-group">
                  <label className="form-label">Nama Meja</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Meja VIP 1" />
                </div>
              )}
              <div className="form-group"><label className="form-label">Tarif per Jam (Rp)</label><input type="number" className="form-input" min={0} value={rate} onChange={e => setRate(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={status} onChange={e => setStatus(e.target.value as Table['status'])}>{statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
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
