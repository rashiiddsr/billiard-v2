'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { companyApi, waitingListApi } from '@/lib/api';
import { Clock3, Users, PhoneCall } from 'lucide-react';

interface WaitingEntry {
  id: string;
  guestName?: string;
  status: 'WAITING' | 'CALLED' | 'DONE' | 'CANCELLED';
  partySize: number;
  notes?: string;
  createdAt: string;
  calledAt?: string;
  member?: { id: string; name: string; memberNumber: string };
  preferredTable?: { id: string; name: string };
}

interface CompanyProfile {
  name?: string;
  logoUrl?: string | null;
}

const FALLBACK_MARQUEE = 'Selamat datang 🎱 Harap perhatikan layar untuk panggilan antrean Anda.';

function WaitingListDisplayContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [now, setNow] = useState(new Date());

  const title = searchParams.get('title') || 'WAITING LIST';
  const subtitle = searchParams.get('subtitle') || 'Antrian Billiard Hari Ini';
  const marquee = searchParams.get('marquee') || FALLBACK_MARQUEE;
  const refreshMs = Number(searchParams.get('refreshMs') || '10000');

  const loadEntries = useCallback(async () => {
    try {
      const data = await waitingListApi.publicDisplay();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    companyApi.getPublicProfile().then(setProfile).catch(() => {});

    const refreshInterval = setInterval(loadEntries, Number.isFinite(refreshMs) ? Math.max(refreshMs, 5000) : 10000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
    };
  }, [loadEntries, refreshMs]);

  const waiting = useMemo(() => entries.filter((e) => e.status === 'WAITING'), [entries]);
  const called = useMemo(() => entries.filter((e) => e.status === 'CALLED'), [entries]);

  return (
    <div className="waiting-display-shell">
      <header className="waiting-display-header">
        <div className="brand-block">
          {profile?.logoUrl && <img src={profile.logoUrl} alt="Logo" className="brand-logo" />}
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className="display-clock">
          <Clock3 size={18} />
          {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </header>

      <section className="waiting-display-content">
        <div className="waiting-column">
          <div className="column-head">
            <Users size={20} /> Menunggu ({waiting.length})
          </div>
          <div className="waiting-list-grid">
            {waiting.length === 0 ? <div className="display-empty">Belum ada antrean.</div> : waiting.map((entry, idx) => (
              <article key={entry.id} className="display-card waiting-card">
                <span className="queue-number">#{idx + 1}</span>
                <h3>{entry.member?.name || entry.guestName || 'Tanpa Nama'}</h3>
                <p>
                  {entry.partySize > 1 ? `${entry.partySize} orang · ` : ''}
                  {entry.preferredTable?.name ? `Meja ${entry.preferredTable.name}` : 'Meja Bebas'}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="waiting-column called-column">
          <div className="column-head">
            <PhoneCall size={20} /> Sedang Dipanggil ({called.length})
          </div>
          <div className="waiting-list-grid">
            {called.length === 0 ? <div className="display-empty">Belum ada panggilan aktif.</div> : called.map((entry) => (
              <article key={entry.id} className="display-card called-card">
                <h2>{entry.member?.name || entry.guestName || 'Tanpa Nama'}</h2>
                <p>
                  Silakan menuju {entry.preferredTable?.name ? `Meja ${entry.preferredTable.name}` : 'meja yang tersedia'}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="display-marquee-wrap">
        <div className="display-marquee-track">{marquee}</div>
      </footer>
    </div>
  );
}

export default function WaitingListDisplayPage() {
  return (
    <Suspense fallback={<div className="waiting-display-shell">Memuat display...</div>}>
      <WaitingListDisplayContent />
    </Suspense>
  );
}
