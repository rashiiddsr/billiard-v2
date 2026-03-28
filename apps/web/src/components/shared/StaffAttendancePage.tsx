'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CalendarCheck, Clock, QrCode, Send, ShieldCheck, XCircle, CheckCircle2, Trash2 } from 'lucide-react';

type RoleType = 'MANAGER' | 'CASHIER';
type StaffTab = 'workspace' | 'approvals' | 'history';

interface Props {
  role: RoleType;
}

const PRESENT_STATUSES = ['ON_TIME', 'LATE', 'EARLY'];
const ABSENT_STATUSES = ['REJECTED', 'ABSENT', 'EXCUSED'];

export default function StaffAttendancePage({ role }: Props) {
  const [payload, setPayload] = useState<any>(null);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [teamRecords, setTeamRecords] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [tab, setTab] = useState<StaffTab>('workspace');
  const [leaveReason, setLeaveReason] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop?: () => void } | null>(null);
  const submittingRef = useRef(false);
  const lastScanRef = useRef('');

  const loadAll = useCallback(async () => {
    try {
      const [publicPayload, recordsRes, pendingRes, dailyReports] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/attendance/public/display`, { cache: 'no-store' }).then((r) => r.json()),
        api.get('/attendance/my-records', { params: { limit: 20 } }).then((r) => r.data),
        role === 'MANAGER' ? api.get('/attendance/leave-requests', { params: { status: 'PENDING' } }).then((r) => r.data) : Promise.resolve([]),
        role === 'MANAGER'
          ? api.get('/attendance/reports/daily', { params: { date: reportDate } }).then((r) => r.data?.data || [])
          : Promise.resolve([]),
      ]);

      setPayload(publicPayload);
      setMyRecords(recordsRes.data || []);
      setPendingLeaves(pendingRes || []);
      setTeamRecords(dailyReports || []);
    } catch {
      toast.error('Gagal memuat data absensi');
    }
  }, [role, reportDate]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  const stopScanner = useCallback(() => {
    if (scannerControlsRef.current?.stop) {
      scannerControlsRef.current.stop();
    }
    scannerControlsRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const checkInWithCode = useCallback(async (qrCode: string) => {
    if (!qrCode || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const geo = await new Promise<{ lat?: number; lng?: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Perangkat tidak mendukung lokasi.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => reject(new Error('Izin lokasi diperlukan untuk absen.')),
          { enableHighAccuracy: true, timeout: 7000 },
        );
      });

      const res = await api.post('/attendance/check-in', { qrCode, ...geo });
      toast.success(res.data?.message || 'Absen diterima');
      await loadAll();
      lastScanRef.current = '';
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Absensi gagal');
      setTimeout(() => {
        lastScanRef.current = '';
      }, 2500);
    } finally {
      submittingRef.current = false;
    }
  }, [loadAll]);

  const hasActiveShift = (payload?.shifts || []).length > 0;
  const hasCheckedInToday = myRecords.some((record) => {
    if (!record?.checkInAt) return false;
    return new Date(record.checkInAt).toDateString() === new Date().toDateString();
  });

  const scanBlockedMessage = useMemo(() => {
    if (hasCheckedInToday) return 'Anda sudah absen.';
    if (!hasActiveShift) return 'Tidak ada shift aktif / jadwal absen telah berakhir.';
    return '';
  }, [hasActiveShift, hasCheckedInToday]);

  useEffect(() => {
    if (tab !== 'workspace' || scanBlockedMessage || !videoRef.current) {
      stopScanner();
      return;
    }

    let active = true;

    const init = async () => {
      try {
        setCameraError('');
        const [{ BrowserQRCodeReader }, zxingCore] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        if (!active || !videoRef.current) return;

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 350,
          delayBetweenScanSuccess: 700,
        });

        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
          if (!active || submittingRef.current) return;
          if (result) {
            const code = result.getText().trim();
            if (code && code !== lastScanRef.current) {
              lastScanRef.current = code;
              void checkInWithCode(code);
            }
            return;
          }

          if (error && !(error instanceof zxingCore.NotFoundException)) {
            setCameraError('Kamera aktif, tetapi QR belum terbaca jelas. Arahkan kamera ke QR display.');
          }
        });

        scannerControlsRef.current = controls;
      } catch {
        setCameraError('Gagal mengakses kamera. Mohon izinkan akses kamera pada browser.');
      }
    };

    void init();

    return () => {
      active = false;
      stopScanner();
    };
  }, [tab, scanBlockedMessage, stopScanner, checkInWithCode]);

  useEffect(() => stopScanner, [stopScanner]);

  const submitLeave = async () => {
    if (!leaveReason.trim()) {
      toast.error('Alasan izin wajib diisi');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      await api.post('/attendance/leave-requests', { type: 'PERMIT', date: today, reason: leaveReason.trim() });
      toast.success('Pengajuan izin harian dikirim');
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

  const deleteRecord = async (id: string) => {
    if (!confirm('Hapus absensi ini? Gunakan hanya untuk data fraud.')) return;
    try {
      await api.delete(`/attendance/records/${id}`);
      toast.success('Data absensi dihapus');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menghapus absensi');
    }
  };

  const tabs = role === 'MANAGER'
    ? [
      { key: 'workspace' as const, label: 'Scan Absen' },
      { key: 'approvals' as const, label: 'Pengajuan Cuti' },
      { key: 'history' as const, label: 'Laporan Absensi' },
    ]
    : [
      { key: 'workspace' as const, label: 'Scan Absen' },
      { key: 'history' as const, label: 'Laporan Absensi' },
    ];

  const presentCount = teamRecords.filter((r) => PRESENT_STATUSES.includes(r.status)).length;
  const absentCount = teamRecords.filter((r) => ABSENT_STATUSES.includes(r.status)).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Absensi Karyawan</h1>
          <p className="page-subtitle">Scan otomatis via kamera + validasi lokasi realtime</p>
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
            <div className="attendance-panel-title"><QrCode size={17} /> Scan Absen</div>

            {scanBlockedMessage ? (
              <div className="alert alert-success" style={{ marginTop: 8 }}>{scanBlockedMessage}</div>
            ) : (
              <>
                <div className="attendance-camera-wrap" style={{ marginTop: 6 }}>
                  <video ref={videoRef} className="attendance-camera-preview" playsInline muted autoPlay />
                </div>
                {cameraError && <div className="alert alert-warning" style={{ marginTop: 10 }}>{cameraError}</div>}
              </>
            )}
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
              <div className="attendance-panel-title"><Send size={16} /> Pengajuan Izin Harian</div>
              <textarea
                className="form-input"
                style={{ minHeight: 90 }}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Tuliskan alasan permit hari ini"
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

      {tab === 'history' && role === 'MANAGER' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="grid-2 mb-4">
            <div className="stat-card">
              <div className="stat-card-icon"><CheckCircle2 size={20} /></div>
              <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{presentCount}</div>
              <div className="stat-card-label">Hadir</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon"><XCircle size={20} /></div>
              <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{absentCount}</div>
              <div className="stat-card-label">Tidak Hadir</div>
            </div>
          </div>

          <div className="card card-padded" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Filter tanggal:</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Karyawan</th><th>Shift</th><th>Jam Check-in</th><th>Jarak</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {teamRecords.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.user?.name || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{r.user?.role?.toLowerCase() || '-'}</div>
                      </td>
                      <td>{r.shift?.name || '-'}</td>
                      <td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString('id-ID') : '-'}</td>
                      <td>{r.distanceMeters ?? '-'}</td>
                      <td>{PRESENT_STATUSES.includes(r.status) ? 'Hadir' : 'Tidak Hadir'}</td>
                      <td>{r.notes || '-'}</td>
                      <td>
                        {!String(r.id).startsWith('absent-') && !String(r.id).startsWith('leave-') ? (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteRecord(r.id)}>
                            <Trash2 size={14} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {teamRecords.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Belum ada data absensi pada tanggal ini</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && role === 'CASHIER' && (
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
                    <td>{PRESENT_STATUSES.includes(r.status) ? 'Hadir' : 'Tidak Hadir'}</td>
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
