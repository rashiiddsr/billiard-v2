'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { companyApi, waitingListApi } from '@/lib/api';
import { Clock3, Users, PhoneCall, Sparkles, PartyPopper, Expand } from 'lucide-react';

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
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function toDisplayName(entry?: WaitingEntry | null) {
  if (!entry) return 'Tanpa Nama';
  return entry.member?.name || entry.guestName || 'Tanpa Nama';
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = PUBLIC_API_URL.replace('/api/v1', '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function WaitingListDisplayContent() {
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [calledModalEntry, setCalledModalEntry] = useState<WaitingEntry | null>(null);
  const [showCalledModal, setShowCalledModal] = useState(false);
  const [hideFullscreenButton, setHideFullscreenButton] = useState(false);
  const calledIdsRef = useRef<Set<string>>(new Set());

  const title = 'WAITING LIST';
  const subtitle = 'Antrian Billiard Hari Ini';
  const marquee = searchParams.get('marquee') || FALLBACK_MARQUEE;
  const refreshMs = Number(searchParams.get('refreshMs') || '10000');
  const modalDurationMs = Number(searchParams.get('modalMs') || '7000');
  const externalLink = searchParams.get('link') || '';
  const openHour = searchParams.get('openHour') || '';
  const closeHour = searchParams.get('closeHour') || '';

  const mediaItems = useMemo(() => {
    const mediaFromList = (searchParams.get('media') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const mediaFromSingles = [
      searchParams.get('media1'),
      searchParams.get('media2'),
      searchParams.get('media3'),
    ].filter((item): item is string => !!item?.trim());

    return [...mediaFromList, ...mediaFromSingles].slice(0, 6);
  }, [searchParams]);

  const loadEntries = useCallback(async () => {
    try {
      const data = await waitingListApi.publicDisplay();
      const normalized = Array.isArray(data) ? data : [];
      setEntries(normalized);

      const calledNow = normalized.filter((entry) => entry.status === 'CALLED');
      const knownCalled = calledIdsRef.current;
      const newcomer = calledNow.find((entry) => !knownCalled.has(entry.id));

      calledIdsRef.current = new Set(calledNow.map((entry) => entry.id));

      if (newcomer) {
        setCalledModalEntry(newcomer);
        setShowCalledModal(true);
      }
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    loadEntries();
    companyApi.getPublicProfile().then(setProfile).catch(() => {});

    const refreshInterval = setInterval(loadEntries, Number.isFinite(refreshMs) ? Math.max(refreshMs, 5000) : 10000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const mediaInterval = setInterval(() => {
      setActiveMediaIndex((prev) => (mediaItems.length ? (prev + 1) % mediaItems.length : 0));
    }, 9000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
      clearInterval(mediaInterval);
    };
  }, [loadEntries, mediaItems.length, refreshMs]);

  useEffect(() => {
    if (!showCalledModal) return;
    const timer = setTimeout(() => setShowCalledModal(false), Number.isFinite(modalDurationMs) ? Math.max(modalDurationMs, 3000) : 7000);
    return () => clearTimeout(timer);
  }, [modalDurationMs, showCalledModal]);

  const waiting = useMemo(() => entries.filter((e) => e.status === 'WAITING'), [entries]);
  const called = useMemo(() => entries.filter((e) => e.status === 'CALLED'), [entries]);

  const handleFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setHideFullscreenButton(true);
    } catch {
      setHideFullscreenButton(false);
    }
  };

  const timeLabel = now
    ? now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className="waiting-display-shell">
      <div className="display-bg-orb orb-1" />
      <div className="display-bg-orb orb-2" />

      {isMounted && !hideFullscreenButton && (
        <button className="display-fullscreen-btn" onClick={handleFullscreen}>
          <Expand size={16} /> Full Screen
        </button>
      )}

      {showCalledModal && calledModalEntry && (
        <div className="called-modal-backdrop" onClick={() => setShowCalledModal(false)}>
          <div className="called-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="called-modal-badge"><PartyPopper size={18} /> Sekarang Dipanggil</div>
            <h2>{toDisplayName(calledModalEntry)}</h2>
            <p>
              Silakan menuju{' '}
              <strong>{calledModalEntry.preferredTable?.name ? `Meja ${calledModalEntry.preferredTable.name}` : 'meja yang tersedia'}</strong>
            </p>
            <button className="btn btn-primary" onClick={() => setShowCalledModal(false)}>Tutup</button>
          </div>
        </div>
      )}

      <header className="waiting-display-header">
        <div className="brand-block">
          {!!profile?.logoUrl && <img src={resolveAssetUrl(profile.logoUrl)} alt="Logo" className="brand-logo" />}
          <div>
            <h1>{title}</h1>
            <p>{profile?.name || subtitle || 'Billiard Lounge'} {openHour && closeHour ? `· ${openHour} - ${closeHour}` : ''}</p>
          </div>
        </div>

        <div className="display-clock" suppressHydrationWarning>
          <Clock3 size={18} />
          {timeLabel}
        </div>
      </header>

      <section className="waiting-display-content">
        <div className="waiting-column glass-soft">
          <div className="column-head">
            <Users size={20} /> Menunggu ({waiting.length})
          </div>
          <div className="waiting-list-grid">
            {waiting.length === 0 ? <div className="display-empty">Belum ada antrean.</div> : waiting.map((entry, idx) => (
              <article key={entry.id} className="display-card waiting-card">
                <span className="queue-number">#{idx + 1}</span>
                <h3>{toDisplayName(entry)}</h3>
                <p>
                  {entry.partySize > 1 ? `${entry.partySize} orang · ` : ''}
                  {entry.preferredTable?.name ? `Meja ${entry.preferredTable.name}` : 'Meja Bebas'}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="waiting-right-column">
          <div className="waiting-column called-column glass-soft">
            <div className="column-head">
              <PhoneCall size={20} /> Sedang Dipanggil ({called.length})
            </div>
            <div className="waiting-list-grid">
              {called.length === 0 ? <div className="display-empty">Belum ada panggilan aktif.</div> : called.map((entry) => (
                <article key={entry.id} className="display-card called-card">
                  <h2>{toDisplayName(entry)}</h2>
                  <p>
                    Silakan menuju {entry.preferredTable?.name ? `Meja ${entry.preferredTable.name}` : 'meja yang tersedia'}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="display-media-panel glass-soft">
            <div className="media-head"><Sparkles size={16} /> Promo & Info</div>
            {mediaItems.length > 0 ? (
              <img src={mediaItems[activeMediaIndex]} alt="Media display" className="display-media-image" />
            ) : (
              <div className="display-media-empty">
                Tambahkan media dari menu owner agar promo tampil menarik.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="display-marquee-wrap glass-soft">
        <div className="display-marquee-track">{marquee}</div>
        {externalLink ? <a href={externalLink} target="_blank" rel="noreferrer" className="display-link-pill">Info</a> : null}
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
