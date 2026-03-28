'use client';

import { useCallback, useEffect, useState } from 'react';
import { membersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Copy, Edit2, Eye, Plus, RefreshCw, Search, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  phoneNumber: string;
  memberNumber: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberSessions: number };
}

interface Credentials {
  email: string;
  password: string;
}

export default function MembersManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [credentialResult, setCredentialResult] = useState<Credentials | null>(null);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [detailMember, setDetailMember] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersApi.list({ search: search || undefined, page, limit: 20 });
      setMembers(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast.error('Gagal memuat data member');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setIsActive(true);
    setCredentialResult(null);
    setResetTarget(null);
    setDetailMember(null);
    setShowModal(true);
  };

  const openEdit = (m: Member) => {
    setEditId(m.id);
    setName(m.name);
    setPhone(m.phoneNumber);
    setIsActive(m.isActive);
    setCredentialResult(null);
    setResetTarget(null);
    setDetailMember(null);
    setShowModal(true);
  };

  const openDetail = async (m: Member) => {
    try {
      const detail = await membersApi.get(m.id);
      setDetailMember(detail);
      setShowModal(true);
      setResetTarget(null);
      setEditId(null);
      setCredentialResult(null);
    } catch {
      toast.error('Gagal memuat detail member');
    }
  };

  const openReset = (m: Member) => {
    setShowModal(true);
    setResetTarget(m);
    setResetEmail(m.email);
    setCredentialResult(null);
    setEditId(null);
    setDetailMember(null);
  };

  const copyCredentials = async () => {
    if (!credentialResult) return;
    const bundle = `Email: ${credentialResult.email}\nPassword: ${credentialResult.password}`;
    await navigator.clipboard.writeText(bundle);
    toast.success('Email & password disalin sekaligus');
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Nama dan nomor HP wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await membersApi.update(editId, { name: name.trim(), phoneNumber: phone.trim(), isActive });
        toast.success('Member diperbarui');
        setShowModal(false);
      } else {
        const res = await membersApi.create({ name: name.trim(), phoneNumber: phone.trim() });
        setCredentialResult(res.credentials);
        toast.success('Member berhasil dibuat');
      }
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan member');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      const res = await membersApi.resetCredentials(resetTarget.id, { email: resetEmail.trim() || undefined });
      setCredentialResult(res.credentials);
      toast.success('Reset akun member berhasil');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal reset akun');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Member</h1>
          <p className="page-subtitle">{total} member terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Tambah Member
        </button>
      </div>

      <div className="card card-padded mb-4" style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Cari nama / no HP / no member"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /></button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Member</th><th>Nama</th><th>No. HP</th><th>Email</th><th>Sesi</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Memuat...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Belum ada member</td></tr>
              ) : members.map((m) => (
                <tr key={m.id}>
                  <td><span className="badge badge-gold" style={{ fontFamily: 'monospace' }}>{m.memberNumber}</span></td>
                  <td>{m.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{m.phoneNumber}</td>
                  <td>{m.email}</td>
                  <td><span className="badge badge-neutral">{m._count.memberSessions}</span></td>
                  <td><span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>{m.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Detail" onClick={() => openDetail(m)}><Eye size={13} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(m)}><Edit2 size={13} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Reset Akun" onClick={() => openReset(m)}><RefreshCw size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 14, borderTop: '1px solid var(--color-border-soft)' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            {credentialResult ? (
              <>
                <div className="card-header"><h3 className="card-title">✅ Kredensial Baru</h3></div>
                <div className="card-body">
                  <div className="alert alert-warning" style={{ marginBottom: 12 }}>Simpan kredensial ini sekarang, hanya tampil sekali.</div>
                  <div style={{ background: 'var(--color-gold-pale)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                    <div><strong>Email:</strong> {credentialResult.email}</div>
                    <div><strong>Password:</strong> {credentialResult.password}</div>
                  </div>
                </div>
                <div className="card-footer" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={copyCredentials}><Copy size={14} /> Salin Sekali</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowModal(false); setCredentialResult(null); setResetTarget(null); }}>Tutup</button>
                </div>
              </>
            ) : detailMember ? (
              <>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 className="card-title">Detail Member</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                </div>
                <div className="card-body" style={{ display: 'grid', gap: 8 }}>
                  <div><strong>Nama:</strong> {detailMember.name}</div>
                  <div><strong>No Member:</strong> {detailMember.memberNumber}</div>
                  <div><strong>Email:</strong> {detailMember.email}</div>
                  <div><strong>No HP:</strong> {detailMember.phoneNumber}</div>
                  <div><strong>Dibuat:</strong> {new Date(detailMember.createdAt).toLocaleString('id-ID')}</div>
                  <div><strong>Total sesi:</strong> {Array.isArray(detailMember.memberSessions) ? detailMember.memberSessions.length : 0}</div>
                  <div style={{ maxHeight: 180, overflow: 'auto', borderTop: '1px solid var(--color-border-soft)', paddingTop: 10 }}>
                    <strong>Riwayat sesi terakhir:</strong>
                    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                      {(detailMember.memberSessions || []).map((s: any) => (
                        <li key={s.id} style={{ marginBottom: 6 }}>
                          {new Date(s.startTime).toLocaleString('id-ID')} · {s.table?.name || '-'} · {s.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setShowModal(false)}>Tutup</button>
                </div>
              </>
            ) : resetTarget ? (
              <>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 className="card-title">Reset Akun Member</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Nama Member</label>
                    <input className="form-input" value={resetTarget.name} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Login</label>
                    <input className="form-input" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  </div>
                  <div className="alert alert-info">Password default baru akan di-generate otomatis saat reset.</div>
                </div>
                <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                  <button className="btn btn-primary" onClick={submitReset} disabled={submitting}>{submitting ? 'Memproses...' : 'Reset Akun'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 className="card-title">{editId ? 'Edit Member' : 'Tambah Member'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Nama</label>
                    <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor HP</label>
                    <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  {editId && (
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                  <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Menyimpan...' : editId ? 'Simpan' : 'Buat Member'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
