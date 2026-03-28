'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, MapPin, QrCode, Radio, ShieldCheck, CalendarDays } from 'lucide-react';

export default function AttendanceDisplayPage() {
  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState<Date | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const load = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/attendance/public/display`, { cache: 'no-store' })
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData(null));
    };
    load();
    const t = setInterval(load, 30000);
    const c = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, []);

  const qrData = data?.qrCode || 'loading';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrData)}`;
  const openHour = searchParams.get('openHour') || '10:00';
  const closeHour = searchParams.get('closeHour') || '23:00';

  const dateLabel = useMemo(() => now
    ? now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '-', [now]);

  const timeLabel = useMemo(() => now
    ? now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--', [now]);

  return (
    <div className="attendance-display-shell">
      <div className="attendance-display-orb orb-a" />
      <div className="attendance-display-orb orb-b" />

      <div className="attendance-display-card">
        <div className="attendance-display-header">
          <div>
            <h1>Display Absensi</h1>
            <p>Scan QR ini via kamera kasir/manager. QR berubah otomatis tiap 5 menit.</p>
          </div>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
            <div className="attendance-display-badge"><Radio size={14} /> Live</div>
            <div className="display-info-pill"><Clock size={14} /> Operasional: {openHour} - {closeHour}</div>
            <div className="display-info-pill"><CalendarDays size={14} /> {dateLabel} · {timeLabel}</div>
          </div>
        </div>

        <div className="attendance-display-grid">
          <div className="attendance-qr-panel">
            <div className="attendance-panel-head"><QrCode size={16} /> QR Kehadiran</div>
            <img src={qrUrl} alt="QR Attendance" width={320} height={320} className="attendance-qr-image" />
            <div className="attendance-qr-expired">Expired: {data?.expiresAt ? new Date(data.expiresAt).toLocaleTimeString('id-ID') : '-'}</div>
            <div className="attendance-qr-note">
              Gunakan scan langsung dari kamera, jangan mengetik manual.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="attendance-info-card">
              <div className="attendance-panel-head"><Clock size={16} /> Shift Aktif</div>
              {(data?.shifts || []).map((s: any) => (
                <div key={s.id} className="attendance-info-row">
                  <strong>{s.name}</strong>
                  <div>{s.startTime} - {s.endTime}</div>
                  <small>Toleransi awal {s.earlyWindowMinutes}m · telat {s.lateToleranceMinutes}m</small>
                </div>
              ))}
              {(!data?.shifts || data.shifts.length === 0) && <div className="attendance-empty">Belum ada shift aktif.</div>}
            </div>

            <div className="attendance-info-card">
              <div className="attendance-panel-head"><MapPin size={16} /> Lokasi Validasi</div>
              <div className="attendance-info-row">
                <strong>{data?.setting?.venueName || 'Venue'}</strong>
                <div>{data?.setting?.locationLat || '-'}, {data?.setting?.locationLng || '-'}</div>
                <small>Radius absensi: {data?.setting?.radiusMeters ?? '-'} meter</small>
              </div>
              <div className="attendance-location-note"><ShieldCheck size={14} /> Absensi hanya valid jika posisi karyawan sesuai radius lokasi.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
