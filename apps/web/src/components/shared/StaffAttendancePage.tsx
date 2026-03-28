'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type RoleType = 'MANAGER' | 'CASHIER';
type StaffTab = 'workspace' | 'approvals' | 'history';

interface Props {
  role: RoleType;
}

export default function StaffAttendancePage({ role }: Props) {
  const [payload, setPayload] = useState<any>(null);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [loadingScan, setLoadingScan] = useState(false);
  const [tab, setTab] = useState<StaffTab>('workspace');
  const [leaveReason, setLeaveReason] = useState('');

  const [scanValue, setScanValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannerSupported, setScannerSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [publicPayload, recordsRes, pendingRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/attendance/public/display`, { cache: 'no-store' }).then((r) => r.json()),
        api.get('/attendance/my-records', { params: { limit: 20 } }).then((r) => r.data),
        role === 'MANAGER' ? api.get('/attendance/leave-requests', { params: { status: 'PENDING' } }).then((r) => r.data) : Promise.resolve([]),
      ]);
      setPayload(publicPayload);
      setMyRecords(recordsRes.data || []);
      setPendingLeaves(pendingRes || []);
    } catch {
      toast.error('Gagal memuat data absensi');
    }
  }, [role]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch {
      setCameraError('Kamera belum diizinkan atau tidak tersedia di perangkat ini.');
      toast.error('Akses kamera dibutuhkan untuk scan QR');
    }
  };

  useEffect(() => {
    setScannerSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  useEffect(() => {
    if (!cameraActive || !scannerSupported || !videoRef.current) return;

    let mounted = true;
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    const tick = async () => {
      if (!mounted || !videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes?.[0]?.rawValue) {
          setScanValue(String(barcodes[0].rawValue));
        }
      } catch {
        // ignore detector errors while stream stabilizes
      }
    };

    const timer = setInterval(tick, 700);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [cameraActive, scannerSupported]);

  useEffect(() => stopCamera, [stopCamera]);

  const handleScan = async () => {
    if (!scanValue.trim()) return toast.error('Arahkan kamera ke QR agar kode terbaca');
    setLoadingScan(true);
    try {
      const geo = await new Promise<{ lat?: number; lng?: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation tidak didukung di browser ini.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => reject(new Error('Izin lokasi diperlukan untuk absen.')),
          { enableHighAccuracy: true, timeout: 7000 },
        );
      });

      const res = await api.post('/attendance/check-in', { qrCode: scanValue.trim(), ...geo });
      toast.success(res.data?.message || 'Absensi berhasil');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Absensi gagal');
    } finally {
      setLoadingScan(false);
    }
  };

  const submitLeave = async () => {
    if (!leaveReason.trim()) {
      toast.error('Alasan izin wajib diisi');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      await api.post('/attendance/leave-requests', { type: 'PERMIT', date: today, reason: leaveReason.trim() });
      toast.success('Pengajuan izin dikirim');
      setLeaveReason('');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengirim pengajuan');
    }
  };

  const reviewLeave = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/attendance/leave-requests/${id}/review`, { status });
      toast.success('Pengajuan diproses');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal memproses');
    }
  };

  const statusText = useMemo(() => {
    if (!payload?.expiresAt) return '-';
    return new Date(payload.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, [payload?.expiresAt]);

  const tabs = role === 'MANAGER'
    ? [
      { key: 'workspace' as const, label: 'Scan & Shift' },
      { key: 'approvals' as const, label: 'Pengajuan Cuti' },
      { key: 'history' as const, label: 'Laporan Absensi' },
    ]
    : [
      { key: 'workspace' as const, label: 'Scan, Shift, Izin' },
      { key: 'history' as const, label: 'Laporan Absensi' },
    ];

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Absensi Karyawan</h1>
          <p className="page-subtitle">Scan QR dari kamera + validasi lokasi realtime</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--color-border)' }}>
        {tabs.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setTab(entry.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 700,
              color: tab === entry.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: tab === entry.key ? '2px solid var(--color-gold)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {entry.key === 'workspace' && <QrCode size={15} />}
            {entry.key === 'approvals' && <ShieldCheck size={15} />}
            {entry.key === 'history' && <CalendarCheck size={15} />}
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'workspace' && (
        <div className="attendance-workspace-grid">
          <div className="card card-padded attendance-scan-panel">
            <div className="attendance-panel-title"><ScanLine size={17} /> Scan QR Kehadiran</div>
            <p className="attendance-panel-subtitle">
              Buka kamera, arahkan ke QR pada layar display, lalu konfirmasi absen.
            </p>

            <div className="attendance-camera-wrap">
              <video ref={videoRef} className="attendance-camera-preview" playsInline muted />
              {!cameraActive && (
                <div className="attendance-camera-overlay">
                  <Camera size={18} /> Kamera belum aktif
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {!cameraActive ? (
                <button className="btn btn-outline" onClick={startCamera}><Camera size={14} /> Aktifkan Kamera</button>
              ) : (
                <button className="btn btn-ghost" onClick={stopCamera}>Matikan Kamera</button>
              )}
              <button className="btn btn-primary" onClick={handleScan} disabled={loadingScan || !scanValue.trim()}>
                <CalendarCheck size={16} /> {loadingScan ? 'Memproses...' : 'Konfirmasi Absen'}
              </button>
            </div>

            {cameraError && <div className="alert alert-warning" style={{ marginTop: 10 }}>{cameraError}</div>}
            {!scannerSupported && (
              <div className="alert alert-warning" style={{ marginTop: 10 }}>
                Browser ini belum mendukung deteksi QR otomatis. Gunakan Chrome/Edge terbaru.
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 10, color: 'var(--color-text-muted)' }}>
              QR aktif hingga {statusText}. Lokasi harus berada dalam radius {payload?.setting?.radiusMeters ?? '-'} meter.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card card-padded">
              <div className="attendance-panel-title"><Clock size={16} /> Shift Aktif</div>
              {(payload?.shifts || []).map((s: any) => (
                <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.startTime} - {s.endTime}</div>
                </div>
              ))}
              {(!payload?.shifts || payload.shifts.length === 0) && <div style={{ color: 'var(--color-text-muted)' }}>Belum ada shift aktif.</div>}
            </div>

            <div className="card card-padded">
              <div className="attendance-panel-title"><Send size={16} /> Pengajuan Izin (Hari Ini)</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{todayLabel}</div>
              <textarea
                className="form-input"
                style={{ minHeight: 90 }}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Tuliskan alasan izin hari ini"
              />
              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submitLeave}>
                <Send size={14} /> Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'approvals' && role === 'MANAGER' && (
        <div className="card card-padded">
          <h3 style={{ marginBottom: 10 }}>Pengajuan Cuti/Izin Karyawan</h3>
          {pendingLeaves.map((p) => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.user?.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  {new Date(p.date).toLocaleDateString('id-ID')} · {p.reason || '-'}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => reviewLeave(p.id, 'REJECTED')}><XCircle size={14} /> Tolak</button>
              <button className="btn btn-primary btn-sm" onClick={() => reviewLeave(p.id, 'APPROVED')}><CheckCircle2 size={14} /> Setujui</button>
            </div>
          ))}
          {pendingLeaves.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>Tidak ada pengajuan pending.</div>}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Tanggal</th><th>Shift</th><th>Jam</th><th>Status</th><th>Catatan</th></tr>
              </thead>
              <tbody>
                {myRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.checkInAt).toLocaleDateString('id-ID')}</td>
                    <td>{r.shift?.name || '-'}</td>
                    <td>{new Date(r.checkInAt).toLocaleTimeString('id-ID')}</td>
                    <td>{r.status}</td>
                    <td>{r.notes || '-'}</td>
                  </tr>
                ))}
                {myRecords.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Belum ada riwayat</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
