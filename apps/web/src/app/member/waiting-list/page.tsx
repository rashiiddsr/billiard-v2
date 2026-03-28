'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { waitingListApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BellRing, CheckCircle2, Clock3, Loader2, Megaphone } from 'lucide-react';

interface WaitingEntry {
  id: string;
  status: 'WAITING' | 'CALLED' | 'DONE' | 'CANCELLED';
  createdAt: string;
  calledAt?: string;
  notes?: string;
  member?: { id: string; name: string; memberNumber: string };
  preferredTable?: { id: string; name: string };
}

const statusMeta: Record<WaitingEntry['status'], { label: string; badge: string }> = {
  WAITING: { label: 'Sedang Menunggu', badge: 'badge-warning' },
  CALLED: { label: 'Sudah Dipanggil', badge: 'badge-info' },
  DONE: { label: 'Selesai', badge: 'badge-success' },
  CANCELLED: { label: 'Dibatalkan', badge: 'badge-neutral' },
};

function playSoftBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // no-op
  }
}

export default function MemberWaitingListPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const wasCalledRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const res = await waitingListApi.list();
        const rows = (Array.isArray(res) ? res : []).filter((item: any) => item.member?.id === user.id);
        const nowCalled = rows.some((row: WaitingEntry) => row.status === 'CALLED');
        if (nowCalled && !wasCalledRef.current) playSoftBeep();
        wasCalledRef.current = nowCalled;
        setEntries(rows);
      } finally {
        setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [user]);

  const current = useMemo(() => entries[0] || null, [entries]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Antrian Member</h1>
          <p className="page-subtitle">Pantau status antrian Anda secara realtime</p>
        </div>
      </div>

      {loading ? (
        <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
          Memuat antrian...
        </div>
      ) : !current ? (
        <div className="card card-padded empty-state">
          <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
          <div style={{ fontWeight: 700 }}>Anda tidak sedang mengantri</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Jika sudah daftar waiting list, status akan muncul di halaman ini.
          </div>
        </div>
      ) : (
        <div className="card card-padded" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock3 size={18} style={{ color: 'var(--color-gold)' }} />
              <strong>{current.member?.name || user?.name}</strong>
            </div>
            <span className={`badge ${statusMeta[current.status].badge}`}>{statusMeta[current.status].label}</span>
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--color-border-soft)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Masuk Antrian</div>
              <div style={{ fontWeight: 700 }}>{new Date(current.createdAt).toLocaleString('id-ID')}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--color-border-soft)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Preferensi Meja</div>
              <div style={{ fontWeight: 700 }}>{current.preferredTable?.name || '-'}</div>
            </div>
          </div>

          {current.status === 'CALLED' && (
            <div className="alert alert-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <BellRing size={16} />
              Nomor antrian Anda sudah dipanggil. Silakan menuju kasir.
            </div>
          )}

          {current.notes && (
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--color-surface-soft)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Catatan</div>
              <div style={{ fontWeight: 600 }}>{current.notes}</div>
            </div>
          )}
        </div>
      )}

      {entries.length > 1 && (
        <div className="card card-padded mt-4">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <Megaphone size={16} />
            <strong>Riwayat status antrian aktif</strong>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {entries.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 12 }}>{new Date(entry.createdAt).toLocaleString('id-ID')}</span>
                <span className={`badge ${statusMeta[entry.status].badge}`}>{statusMeta[entry.status].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
