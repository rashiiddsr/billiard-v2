'use client';

import { useEffect, useMemo, useState } from 'react';
import { MonitorSmartphone, Copy, ExternalLink, BellRing, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerWaitingDisplayPage() {
  const [marquee, setMarquee] = useState('Selamat datang 🎱 Harap perhatikan layar untuk panggilan antrean Anda.');
  const [refreshMs, setRefreshMs] = useState(10000);
  const [modalMs, setModalMs] = useState(7000);
  const [images, setImages] = useState<string[]>([]);
  const [openHour, setOpenHour] = useState('10:00');
  const [closeHour, setCloseHour] = useState('23:00');

  useEffect(() => {
    const op = localStorage.getItem('company-operational-hours');
    if (!op) return;
    try {
      const parsed = JSON.parse(op);
      if (parsed?.openHour) setOpenHour(parsed.openHour);
      if (parsed?.closeHour) setCloseHour(parsed.closeHour);
    } catch {}
  }, []);

  const displayUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams({
      marquee,
      refreshMs: String(refreshMs),
      modalMs: String(modalMs),
      openHour,
      closeHour,
    });

    if (images.length) params.set('media', images.join(','));

    return `${window.location.origin}/display/waiting-list?${params.toString()}`;
  }, [marquee, refreshMs, modalMs, images, openHour, closeHour]);

  const attendanceDisplayUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams({ openHour, closeHour });
    return `${window.location.origin}/display/attendance?${params.toString()}`;
  }, [openHour, closeHour]);

  const handleCopy = async () => {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    toast.success('Link display berhasil disalin');
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).slice(0, 4);
    const base64Files = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setImages(base64Files.filter(Boolean));
  };

  return (
    <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Display Waiting List TV</h1>
          <p className="page-subtitle">Konfigurasi lengkap: running text, gambar upload, auto refresh, durasi modal, dan link display siap pakai.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MonitorSmartphone size={18} /> Konfigurasi Display TV
          </h3>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Running Text</label>
            <textarea className="form-input" rows={3} value={marquee} onChange={(e) => setMarquee(e.target.value)} />
          </div>

          <div className="card" style={{ borderStyle: 'dashed' }}>
            <div className="card-body" style={{ paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 8 }}>
                <UploadCloud size={16} /> Upload Gambar Promo (maks 4)
              </div>
              <input className="form-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => handleUpload(e.target.files)} />
              <small style={{ color: 'var(--color-text-muted)' }}>Rekomendasi rasio 16:9, minimal 1280x720 agar cocok di TV.</small>
              {images.length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {images.map((img, idx) => <img key={idx} src={img} alt={`Promo ${idx + 1}`} style={{ width: '100%', height: 68, objectFit: 'cover', borderRadius: 8 }} />)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Auto Refresh (ms)</label>
              <input className="form-input" type="number" min={5000} step={1000} value={refreshMs} onChange={(e) => setRefreshMs(Number(e.target.value) || 10000)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label"><BellRing size={14} style={{ display: 'inline', marginRight: 4 }} />Durasi Modal Panggilan (ms)</label>
              <input className="form-input" type="number" min={3000} step={500} value={modalMs} onChange={(e) => setModalMs(Number(e.target.value) || 7000)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Jam Operasional Buka</label>
              <input className="form-input" type="time" value={openHour} onChange={(e) => setOpenHour(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Jam Operasional Tutup</label>
              <input className="form-input" type="time" value={closeHour} onChange={(e) => setCloseHour(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Link Display TV</label>
            <input className="form-input" value={displayUrl} readOnly />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Link Display Absensi</label>
            <input className="form-input" value={attendanceDisplayUrl} readOnly />
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
