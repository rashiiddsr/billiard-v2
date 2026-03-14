'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Clock, CreditCard, Calendar, ChevronRight, Filter } from 'lucide-react';

interface Session {
  id: string;
  startTime: string;
  actualEndTime: string | null;
  endTime: string;
  durationMinutes: number;
  totalAmount: string;
  rateType: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  guestName: string | null;
  table: { id: string; name: string };
  payments: { totalAmount: string; paidAt: string | null; status: string }[];
}

const rateTypeLabel: Record<string, string> = {
  HOURLY:     'Per Jam',
  FLEXIBLE:   'Main Bebas',
  OWNER_LOCK: 'Owner Lock',
  PACKAGE:    'Paket',
};

const statusBadge: Record<string, string> = {
  ACTIVE:    'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-neutral',
};

const statusLabel: Record<string, string> = {
  ACTIVE:    'Aktif',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export default function MemberHistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const params: any = { memberId: user.id, page, limit: 15 };
    if (filterStatus) params.status = filterStatus;

    api.get('/billing/sessions', { params })
      .then((r) => {
        setSessions(r.data.data);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, page, filterStatus]);

  const totalPages = Math.ceil(total / 15);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} menit`;
    if (m === 0) return `${h} jam`;
    return `${h} jam ${m} menit`;
  };

  const isPaid = (s: Session) =>
    s.payments.some((p) => p.status === 'PAID');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Riwayat Main</h1>
          <p className="page-subtitle">{total} sesi billing</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card card-padded mb-4" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="COMPLETED">Selesai</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          Memuat riwayat...
        </div>
      ) : sessions.length === 0 ? (
        <div className="card card-padded empty-state">
          <div className="empty-state-icon"><Clock size={24} /></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Belum Ada Riwayat</div>
          <div style={{ fontSize: 13 }}>Riwayat billing Anda akan muncul di sini</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((s) => {
            const paid = isPaid(s);
            const dateStr = new Date(s.startTime).toLocaleDateString('id-ID', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            });
            const timeStr = new Date(s.startTime).toLocaleTimeString('id-ID', {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={s.id} className="card card-padded" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Ikon tanggal */}
                <div style={{
                  flexShrink: 0,
                  width: 48, height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: s.status === 'ACTIVE' ? 'var(--color-warning-bg)' : 'var(--color-gold-pale)',
                  border: `1.5px solid ${s.status === 'ACTIVE' ? 'var(--color-warning-border)' : 'var(--color-gold-light)'}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Calendar size={16} style={{ color: s.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-gold)' }} />
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(s.startTime).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Meja {s.table.name}</span>
                    <span className={`badge ${statusBadge[s.status]}`}>{statusLabel[s.status]}</span>
                    {paid && <span className="badge badge-gold">Lunas</span>}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>
                      <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {timeStr} · {formatDuration(s.durationMinutes)}
                    </span>
                    <span style={{ color: 'var(--color-text-light)', fontSize: 11 }}>
                      {rateTypeLabel[s.rateType] || s.rateType}
                    </span>
                  </div>
                </div>

                {/* Harga */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>
                    Rp {Number(s.totalAmount).toLocaleString('id-ID')}
                  </div>
                  {s.status === 'ACTIVE' && (
                    <div style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 600 }}>Berjalan</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-dark' : 'btn-ghost'}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
