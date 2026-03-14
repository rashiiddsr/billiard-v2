'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Clock, CreditCard, Calendar, Hash } from 'lucide-react';

interface Session {
  id: string;
  startTime: string;
  actualEndTime: string | null;
  endTime: string;
  durationMinutes: number;
  totalAmount: string;
  rateType: string;
  status: string;
  table: { name: string };
  payments: { totalAmount: string; paidAt: string }[];
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/sessions', { params: { memberId: user?.id, limit: 5 } })
      .then((r) => setSessions(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}j ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  };

  const statusBadge: Record<string, string> = {
    ACTIVE: 'badge-warning',
    COMPLETED: 'badge-success',
    CANCELLED: 'badge-neutral',
  };

  return (
    <div>
      {/* Welcome card */}
      <div className="member-card-visual mb-6">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Selamat Datang</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>
            {user?.name}
          </div>
          <div className="member-number">{user?.memberNumber || '—'}</div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Kartu Member Billiard</div>
        </div>
      </div>

      {/* Riwayat terakhir */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>
        Riwayat Main Terbaru
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Memuat...</div>
      ) : sessions.length === 0 ? (
        <div className="card card-padded empty-state">
          <div className="empty-state-icon"><Clock size={24} /></div>
          <div>Belum ada riwayat billing</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((s) => (
            <div key={s.id} className="card card-padded" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'var(--color-gold-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Clock size={20} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700 }}>Meja {s.table.name}</div>
                  <span className={`badge ${statusBadge[s.status] || 'badge-neutral'}`}>{s.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {new Date(s.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {formatDuration(s.durationMinutes)}</span>
                  <span><CreditCard size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Rp {Number(s.totalAmount).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
