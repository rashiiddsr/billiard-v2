'use client';

import { useState, useEffect, useCallback } from 'react';
import { tablesApi } from '@/lib/api';
import { asArray } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  description?: string;
  hourlyRate: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  isActive: boolean;
  createdAt: string;
}

const statusLabel: Record<string, { label: string; cls: string; Icon: any }> = {
  AVAILABLE:   { label: 'Tersedia',   cls: 'badge-success', Icon: CheckCircle },
  OCCUPIED:    { label: 'Terisi',     cls: 'badge-warning', Icon: Clock },
  MAINTENANCE: { label: 'Maintenance',cls: 'badge-neutral', Icon: AlertTriangle },
};

export default function DeveloperTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [hourlyRate, setRate]     = useState('');
  const [isActive, setActive]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tablesApi.list(true);
      setTables(asArray(res));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null); setName(''); setDesc(''); setRate(''); setActive(true);
    setShowModal(true);
  };

  const openEdit = (t: Table) => {
    setEditId(t.id); setName(t.name); setDesc(t.description || '');
    setRate(t.hourlyRate); setActive(t.isActive);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Nama meja wajib diisi'); return; }
    if (!hourlyRate || Number(hourlyRate) < 0) { toast.error('Tarif tidak valid'); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await tablesApi.update(editId, { name: name.trim(), description: description || undefined, hourlyRate: Number(hourlyRate), isActive });
        toast.success('Meja diperbarui');
      } else {
        await tablesApi.create({ name: name.trim(), description: description || undefined, hourlyRate: Number(hourlyRate) });
        toast.success('Meja dibuat');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus meja "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await tablesApi.remove(id);
      toast.success('Meja dihapus');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus meja');
    }
  };

  const handleSetStatus = async (id: string, status: string) => {
    try {
      await tablesApi.setStatus(id, status);
      toast.success('Status meja diperbarui');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengubah status');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Meja</h1>
          <p className="page-subtitle">{tables.length} meja terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Tambah Meja
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama</th>
                <th>Tarif/Jam</th>
                <th>Status</th>
                <th>Aktif</th>
                <th>Override Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
              ) : tables.map((t) => {
                const cfg = statusLabel[t.status] || statusLabel.AVAILABLE;
                const { Icon } = cfg;
                return (
                  <tr key={t.id}>
                    <td><code style={{ fontSize: 12 }}>{t.id}</code></td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>Rp {Number(t.hourlyRate).toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', gap: 4 }}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {t.isActive ? 'Ya' : 'Tidak'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={t.status}
                        onChange={(e) => handleSetStatus(t.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="OCCUPIED">OCCUPIED</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t.id, t.name)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className="card-title">{editId ? 'Edit Meja' : 'Tambah Meja'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Nama Meja <span className="required">*</span></label>
                <input className="form-input" placeholder="contoh: Meja 1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <input className="form-input" placeholder="Opsional" value={description} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tarif per Jam (Rp) <span className="required">*</span></label>
                <input type="number" className="form-input" placeholder="25000" min={0} value={hourlyRate} onChange={(e) => setRate(e.target.value)} />
              </div>
              {editId && (
                <div className="form-group">
                  <label className="form-label">Status Aktif</label>
                  <select className="form-select" value={isActive ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
