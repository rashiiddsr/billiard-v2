'use client';

import { useMemo, useState } from 'react';
import { MonitorSmartphone, Copy, ExternalLink, ImagePlus, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerWaitingDisplayPage() {
  const [title, setTitle] = useState('WAITING LIST');
  const [subtitle, setSubtitle] = useState('Antrian Billiard Hari Ini');
  const [marquee, setMarquee] = useState('Selamat datang 🎱 Harap perhatikan layar untuk panggilan antrean Anda.');
  const [refreshMs, setRefreshMs] = useState(10000);
  const [modalMs, setModalMs] = useState(7000);
  const [media1, setMedia1] = useState('');
  const [media2, setMedia2] = useState('');
  const [media3, setMedia3] = useState('');

  const displayUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams({
      title,
      subtitle,
      marquee,
      refreshMs: String(refreshMs),
      modalMs: String(modalMs),
    });

    if (media1.trim()) params.set('media1', media1.trim());
    if (media2.trim()) params.set('media2', media2.trim());
    if (media3.trim()) params.set('media3', media3.trim());

    return `${window.location.origin}/display/waiting-list?${params.toString()}`;
  }, [title, subtitle, marquee, refreshMs, modalMs, media1, media2, media3]);

  const handleCopy = async () => {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    toast.success('Link display berhasil disalin');
  };

  return (
    <div style={{ maxWidth: 920 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Display Waiting List TV</h1>
          <p className="page-subtitle">Atur tampilan layar publik tanpa login untuk TV/monitor.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MonitorSmartphone size={18} /> Pengaturan Tampilan
          </h3>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Judul</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Subjudul</label>
            <input className="form-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Running Text</label>
            <textarea className="form-input" rows={3} value={marquee} onChange={(e) => setMarquee(e.target.value)} />
          </div>

          <div className="card" style={{ borderStyle: 'dashed' }}>
            <div className="card-body" style={{ paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 8 }}>
                <ImagePlus size={16} /> Media / Gambar Promo (opsional)
              </div>
              <div className="form-group">
                <label className="form-label">URL Gambar 1</label>
                <input className="form-input" placeholder="https://..." value={media1} onChange={(e) => setMedia1(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">URL Gambar 2</label>
                <input className="form-input" placeholder="https://..." value={media2} onChange={(e) => setMedia2(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">URL Gambar 3</label>
                <input className="form-input" placeholder="https://..." value={media3} onChange={(e) => setMedia3(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Auto Refresh (ms)</label>
              <input
                className="form-input"
                type="number"
                min={5000}
                step={1000}
                value={refreshMs}
                onChange={(e) => setRefreshMs(Number(e.target.value) || 10000)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label"><BellRing size={14} style={{ display: 'inline', marginRight: 4 }} />Durasi Modal Panggilan (ms)</label>
              <input
                className="form-input"
                type="number"
                min={3000}
                step={500}
                value={modalMs}
                onChange={(e) => setModalMs(Number(e.target.value) || 7000)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Link Display TV</label>
            <input className="form-input" value={displayUrl} readOnly />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCopy}><Copy size={15} /> Salin Link</button>
            <a className="btn btn-ghost" href={displayUrl || '#'} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Buka Preview
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
