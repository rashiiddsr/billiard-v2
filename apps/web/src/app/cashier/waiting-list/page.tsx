'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { membersApi } from '@/lib/api';
import { asArray } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Plus, Clock, PhoneCall, CheckCheck, X, Search,
  User, Users, Trash2, RefreshCw,
} from 'lucide-react';

interface WaitingEntry {
  id: string;
  guestName?: string;
  partySize: number;
  notes?: string;
  status: 'WAITING' | 'CALLED' | 'DONE' | 'CANCELLED';
  createdAt: string;
  calledAt?: string;
  member?: { id: string; name: string; memberNumber: string; phoneNumber: string };
  preferredTable?: { id: string; name: string; status: string };
  createdBy: { id: string; name: string };
}

interface Table {
  id: string;
  name: string;
  status: string;
}

interface Member {
  id: string;
  name: string;
  memberNumber: string;
  phoneNumber: string;
}

const statusLabel: Record<string, { label: string; className: string }> = {
  WAITING:   { label: 'Menunggu', className: 'badge badge-warning' },
  CALLED:    { label: 'Dipanggil', className: 'badge badge-info' },
  DONE:      { label: 'Selesai', className: 'badge badge-success' },
  CANCELLED: { label: 'Dibatalkan', className: 'badge badge-neutral' },
};

export default function WaitingListPage() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [type, setType] = useState<'guest' | 'member'>('guest');
  const [guestName, setGuestName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [preferredTableId, setPreferredTableId] = useState('');
  const [notes, setNotes] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const res = await api.get('/waiting-list');
      setEntries(asArray(res));
    } catch {
      toast.error('Gagal memuat waiting list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    api.get('/tables').then((r) => setTables(asArray(r.data))).catch(() => {});
    const interval = setInterval(loadEntries, 15000); // refresh tiap 15 detik
    return () => clearInterval(interval);
  }, [loadEntries]);

  const searchMembers = async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try {
      const res = await api.get('/members/search', { params: { q } });
      setMemberResults(asArray(res));
    } catch {}
  };

  const handleUpdateStatus = async (id: string, action: 'call' | 'done' | 'cancel') => {
    try {
      await api.patch(`/waiting-list/${id}/${action}`);
      toast.success(action === 'call' ? 'Tamu dipanggil!' : action === 'done' ? 'Antrian selesai' : 'Antrian dibatalkan');
      loadEntries();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memperbarui status');
    }
  };

  const handleSubmit = async () => {
    if (type === 'guest' && !guestName.trim()) {
      toast.error('Masukkan nama tamu'); return;
    }
    if (type === 'member' && !selectedMember) {
      toast.error('Pilih member'); return;
    }

    setSubmitting(true);
    try {
      await api.post('/waiting-list', {
        guestName: type === 'guest' ? guestName.trim() : undefined,
        memberId: type === 'member' ? selectedMember?.id : undefined,
        preferredTableId: preferredTableId || undefined,
        notes: notes || undefined,
        partySize,
      });
      toast.success('Berhasil ditambahkan ke antrian');
      setShowModal(false);
      resetForm();
      loadEntries();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menambahkan ke antrian');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('guest'); setGuestName(''); setMemberSearch('');
    setMemberResults([]); setSelectedMember(null);
    setPreferredTableId(''); setNotes(''); setPartySize(1);
  };

  const waitingCount = entries.filter((e) => e.status === 'WAITING').length;
  const calledCount  = entries.filter((e) => e.status === 'CALLED').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Waiting List</h1>
          <p className="page-subtitle">
            {waitingCount} menunggu · {calledCount} dipanggil
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadEntries}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Tambah Antrian
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Memuat...</div>
      ) : entries.length === 0 ? (
        <div className="card card-padded empty-state">
          <div className="empty-state-icon"><Users size={24} /></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Antrian Kosong</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Semua tamu sudah dilayani atau belum ada antrian
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry, idx) => {
            const displayName = entry.member?.name || entry.guestName || '—';
            const isMember = !!entry.member;

            return (
              <div key={entry.id} className="waiting-item">
                {/* Nomor urut */}
                <div className="waiting-number">{idx + 1}</div>

                {/* Nama & Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</span>
                    {isMember && (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>
                        {entry.member!.memberNumber}
                      </span>
                    )}
                    <span className={statusLabel[entry.status]?.className || 'badge badge-neutral'}>
                      {statusLabel[entry.status]?.label || entry.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {entry.partySize > 1 && <span>{entry.partySize} orang · </span>}
                    {entry.preferredTable && <span>Meja {entry.preferredTable.name} · </span>}
                    {isMember && <span>{entry.member!.phoneNumber} · </span>}
                    <span>
                      <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                      {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {entry.notes && <span> · {entry.notes}</span>}
                  </div>
                </div>

                {/* Aksi */}
                {entry.status === 'WAITING' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleUpdateStatus(entry.id, 'call')}
                      title="Panggil"
                    >
                      <PhoneCall size={14} /> Panggil
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUpdateStatus(entry.id, 'cancel')}
                      title="Batalkan"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {entry.status === 'CALLED' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateStatus(entry.id, 'done')}
                    >
                      <CheckCheck size={14} /> Selesai
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUpdateStatus(entry.id, 'cancel')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tambah antrian */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Tambah ke Antrian</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              {/* Tipe: Guest vs Member */}
              <div className="form-group">
                <label className="form-label">Tipe Tamu</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`btn ${type === 'guest' ? 'btn-dark' : 'btn-outline'} btn-sm`}
                    onClick={() => setType('guest')}
                    style={{ flex: 1 }}
                  >
                    <User size={14} /> Tamu
                  </button>
                  <button
                    className={`btn ${type === 'member' ? 'btn-dark' : 'btn-outline'} btn-sm`}
                    onClick={() => setType('member')}
                    style={{ flex: 1 }}
                  >
                    <Users size={14} /> Member
                  </button>
                </div>
              </div>

              {type === 'guest' ? (
                <div className="form-group">
                  <label className="form-label">Nama Tamu <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="Masukkan nama tamu"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Cari Member <span className="required">*</span></label>
                  {selectedMember ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background: 'var(--color-gold-pale)',
                      border: '1.5px solid var(--color-gold)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{selectedMember.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {selectedMember.memberNumber} · {selectedMember.phoneNumber}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedMember(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                        <input
                          className="form-input"
                          placeholder="Nama, no HP, atau nomor member..."
                          value={memberSearch}
                          onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }}
                          style={{ paddingLeft: 36 }}
                        />
                      </div>
                      {memberResults.length > 0 && (
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: 4, overflow: 'hidden' }}>
                          {memberResults.map((m) => (
                            <button
                              key={m.id}
                              style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border-soft)' }}
                              onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }}
                            >
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                {m.memberNumber} · {m.phoneNumber}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Jumlah Orang</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferensi Meja</label>
                  <select
                    className="form-select"
                    value={preferredTableId}
                    onChange={(e) => setPreferredTableId(e.target.value)}
                  >
                    <option value="">Meja mana saja</option>
                    {tables.filter((t) => t.status === 'AVAILABLE').map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan</label>
                <input
                  className="form-input"
                  placeholder="Opsional..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="card-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
