'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';

export default function AttendanceDisplayPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/attendance/public/display`, { cache: 'no-store' })
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData(null));
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const qrData = data?.qrCode || 'loading';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="attendance-page" style={{ minHeight: '100vh', padding: 24 }}>
      <div className="attendance-card" style={{ maxWidth: 900, width: '100%' }}>
        <h1 style={{ marginBottom: 8 }}>Display Absensi</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 18 }}>QR akan berubah otomatis setiap 5 menit.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ textAlign: 'center', background: '#fff', borderRadius: 12, padding: 16 }}>
            <img src={qrUrl} alt="QR Attendance" width={280} height={280} />
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>Expired: {data?.expiresAt ? new Date(data.expiresAt).toLocaleTimeString('id-ID') : '-'}</div>
          </div>
          <div>
            <div className="card card-padded" style={{ marginBottom: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Shift Aktif</h3>
              {(data?.shifts || []).map((s: any) => (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <strong>{s.name}</strong> · {s.startTime}-{s.endTime}<br />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}><Clock size={12} /> toleransi awal {s.earlyWindowMinutes}m · telat {s.lateToleranceMinutes}m</span>
                </div>
              ))}
            </div>
            <div className="card card-padded">
              <h3 style={{ marginBottom: 8 }}>Lokasi Absen</h3>
              <div style={{ fontSize: 14 }}><MapPin size={14} /> {data?.setting?.venueName || 'Venue'}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{data?.setting?.locationLat}, {data?.setting?.locationLng}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Radius: {data?.setting?.radiusMeters ?? '-'} meter</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
