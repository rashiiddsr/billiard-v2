'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Users, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  phoneNumber: string;
  memberNumber: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberSessions: number };
}

export default function ManagerMembersPage() {
  const [members, setMembers]   = useState<Member[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [credResult, setCredResult] = useState<{ email: string; password: string } | null>(null);

  // Form
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/members', {
        params: { search: search || undefined, page, limit: 20 },
      });
      setMembers(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Gagal memuat member'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null); setName(''); setPhone(''); setIsActive(true);
    setCredResult(null); setShowModal(true);
  };

  const openEdit = (m: Member) => {
    setEditId(m.id); setName(m.name); setPhone(m.phoneNumber);
    setIsActive(m.isActive); setCredResult(null); setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { toast.error('Nama dan no HP wajib diisi'); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await api.patch(`/members/${editId}`, { name: name.trim(), phoneNumber: phone.trim(), isActive });
        toast.success('Member diperbarui'); setShowModal(false);
      } else {
        const res = await api.post('/members', { name: name.trim(), phoneNumber: phone.trim() });
        setCredResult(res.data.credentials);
        toast.success('Member berhasil dibuat!');
      }
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member</h1>
          <p className="page-subtitle">{total} member terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Tambah Member
        </button>
      </div>

      <div className="card card-padded mb-4">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input className="form-input" placeholder="Cari nama, no HP, atau nomor member..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 36 }} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>No. Member</th><th>Nama</th><th>No. HP</th><th>Total Sesi</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  <div className="empty-state"><div className="empty-state-icon"><Users size={22} /></div>Belum ada member</div>
                </td></tr>
              ) : members.map((m) => (
                <tr key={m.id}>
                  <td><span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{m.memberNumber}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-gold-pale)', border: '1px solid var(--color-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'var(--color-primary)', flexShrink: 0 }}>
                        {m.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{m.phoneNumber}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge badge-neutral">{m._count.memberSessions}</span></td>
                  <td><span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>{m.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}><Edit2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--color-border-soft)' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            {credResult ? (
              <>
                <div className="card-header"><h3 className="card-title" style={{ color: 'var(--color-success)' }}>✅ Member Dibuat</h3></div>
                <div className="card-body">
                  <div className="alert alert-warning mb-3">⚠️ Simpan password ini sekarang, tidak bisa dilihat lagi.</div>
                  <div style={{ background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>EMAIL LOGIN</div>
                      <code style={{ fontSize: 12, background: 'white', padding: '5px 8px', borderRadius: 4, display: 'block', border: '1px solid var(--color-border)' }}>{credResult.email}</code>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>PASSWORD</div>
                      <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, background: 'white', padding: '8px 10px', borderRadius: 4, display: 'block', border: '1px solid var(--color-border)' }}>{credResult.password}</code>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowModal(false); setCredResult(null); }}>Tutup</button>
                </div>
              </>
            ) : (
              <>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">{editId ? 'Edit Member' : 'Tambah Member'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                    <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama member" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor HP <span className="required">*</span></label>
                    <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" />
                  </div>
                  {editId && (
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
                        <option value="true">Aktif</option><option value="false">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Menyimpan...' : editId ? 'Simpan' : 'Buat Member'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
