'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CalendarCheck, CheckCircle, Clock, History, MapPin, QrCode, Send } from 'lucide-react';

type RoleType = 'MANAGER' | 'CASHIER';

interface Props {
  role: RoleType;
}

export default function StaffAttendancePage({ role }: Props) {
  const [payload, setPayload] = useState<any>(null);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [scanValue, setScanValue] = useState('');
  const [loadingScan, setLoadingScan] = useState(false);
  const [tab, setTab] = useState<'scan' | 'history' | 'leave' | 'shifts'>(role === 'MANAGER' ? 'scan' : 'scan');
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<'SICK' | 'PERMIT' | 'OTHER'>('SICK');
  const [leaveReason, setLeaveReason] = useState('');
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [publicPayload, recordsRes, leavesRes, pendingRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/attendance/public/display`, { cache: 'no-store' }).then((r) => r.json()),
        api.get('/attendance/my-records', { params: { limit: 20 } }).then((r) => r.data),
        api.get('/attendance/leave-requests/my').then((r) => r.data),
        role === 'MANAGER' ? api.get('/attendance/leave-requests', { params: { status: 'PENDING' } }).then((r) => r.data) : Promise.resolve([]),
      ]);
      setPayload(publicPayload);
      setMyRecords(recordsRes.data || []);
      setMyLeaves(leavesRes || []);
      setPendingLeaves(pendingRes || []);
      if (!scanValue) setScanValue(publicPayload?.qrCode || '');
    } catch {
      toast.error('Gagal memuat data absensi');
    }
  }, [role, scanValue]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  const handleScan = async () => {
    if (!scanValue.trim()) return toast.error('QR code wajib diisi');
    setLoadingScan(true);
    try {
      const getLocation = () =>
        new Promise<{ lat?: number; lng?: number }>((resolve) => {
          if (!navigator.geolocation) return resolve({});
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({}),
            { enableHighAccuracy: true, timeout: 7000 },
          );
        });
      const geo = await getLocation();
      const res = await api.post('/attendance/check-in', { qrCode: scanValue.trim(), ...geo });
      toast.success(res.data?.message || 'Absensi berhasil');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Absensi gagal');
    } finally {
      setLoadingScan(false);
    }
  };

  const submitLeave = async () => {
    try {
      await api.post('/attendance/leave-requests', { type: leaveType, date: leaveDate, reason: leaveReason || undefined });
      toast.success('Pengajuan izin dikirim');
      setLeaveReason('');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengirim izin');
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

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Absensi Karyawan</h1></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['scan', 'history', 'leave', 'shifts'].map((k) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(k as any)}>
            {k === 'scan' && <QrCode size={14} />} {k === 'history' && <History size={14} />} {k === 'leave' && <Send size={14} />} {k === 'shifts' && <Clock size={14} />}
            {k === 'scan' ? 'Scan QR' : k === 'history' ? 'Riwayat' : k === 'leave' ? 'Izin/Sakit' : 'Shift'}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="card card-padded" style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>Tempel hasil scan QR dari halaman display.</div>
          <input className="form-input" value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Kode QR" />
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleScan} disabled={loadingScan}><CalendarCheck size={16} /> Absen Sekarang</button>
          <div style={{ fontSize: 12, marginTop: 14, color: 'var(--color-text-muted)' }}>
            QR aktif berakhir sekitar jam {statusText}. Lokasi wajib sesuai radius {payload?.setting?.radiusMeters ?? '-'}m.
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card"><div className="table-wrapper"><table className="data-table"><thead><tr><th>Tanggal</th><th>Shift</th><th>Jam</th><th>Status</th><th>Catatan</th></tr></thead><tbody>
          {myRecords.map((r) => <tr key={r.id}><td>{new Date(r.checkInAt).toLocaleDateString('id-ID')}</td><td>{r.shift?.name}</td><td>{new Date(r.checkInAt).toLocaleTimeString('id-ID')}</td><td>{r.status}</td><td>{r.notes || '-'}</td></tr>)}
          {myRecords.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Belum ada riwayat</td></tr>}
        </tbody></table></div></div>
      )}

      {tab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div className="card card-padded" style={{ maxWidth: 640 }}>
            <h3 style={{ marginBottom: 10 }}>Pengajuan Izin/Sakit</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" className="form-input" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
              <select className="form-select" value={leaveType} onChange={(e) => setLeaveType(e.target.value as any)}><option value="SICK">Sakit</option><option value="PERMIT">Izin</option><option value="OTHER">Lainnya</option></select>
            </div>
            <textarea className="form-input" style={{ marginTop: 10, minHeight: 80 }} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Alasan" />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submitLeave}>Kirim Pengajuan</button>
          </div>

          {role === 'MANAGER' && (
            <div className="card card-padded">
              <h3 style={{ marginBottom: 10 }}>Approval Pengajuan Kasir</h3>
              {pendingLeaves.map((p) => (
                <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>{p.user?.name} · {new Date(p.date).toLocaleDateString('id-ID')} · {p.type}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => reviewLeave(p.id, 'REJECTED')}>Tolak</button>
                  <button className="btn btn-primary btn-sm" onClick={() => reviewLeave(p.id, 'APPROVED')}>Approve</button>
                </div>
              ))}
              {pendingLeaves.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>Tidak ada pengajuan pending.</div>}
            </div>
          )}

          <div className="card"><div className="table-wrapper"><table className="data-table"><thead><tr><th>Tanggal</th><th>Tipe</th><th>Status</th><th>Catatan</th></tr></thead><tbody>
            {myLeaves.map((l) => <tr key={l.id}><td>{new Date(l.date).toLocaleDateString('id-ID')}</td><td>{l.type}</td><td>{l.status}</td><td>{l.reason || '-'}</td></tr>)}
            {myLeaves.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Belum ada pengajuan</td></tr>}
          </tbody></table></div></div>
        </div>
      )}

      {tab === 'shifts' && (
        <div className="card card-padded">
          {(payload?.shifts || []).map((s: any) => (
            <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.startTime} - {s.endTime} · toleransi {s.lateToleranceMinutes} menit · radius {payload?.setting?.radiusMeters || '-'}m</div>
            </div>
          ))}
          {(!payload?.shifts || payload.shifts.length === 0) && <div>Belum ada shift aktif.</div>}
        </div>
      )}
    </div>
  );
}
