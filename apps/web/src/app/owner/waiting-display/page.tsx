'use client';

import { useMemo, useState } from 'react';
import { MonitorSmartphone, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerWaitingDisplayPage() {
  const [title, setTitle] = useState('WAITING LIST');
  const [subtitle, setSubtitle] = useState('Antrian Billiard Hari Ini');
  const [marquee, setMarquee] = useState('Selamat datang 🎱 Harap perhatikan layar untuk panggilan antrean Anda.');
  const [refreshMs, setRefreshMs] = useState(10000);

  const displayUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams({
      title,
      subtitle,
      marquee,
      refreshMs: String(refreshMs),
    });
    return `${window.location.origin}/display/waiting-list?${params.toString()}`;
  }, [title, subtitle, marquee, refreshMs]);

  const handleCopy = async () => {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    toast.success('Link display berhasil disalin');
  };

  return (
    <div style={{ maxWidth: 900 }}>
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
          <div className="form-group">
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

          <div className="form-group">
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
