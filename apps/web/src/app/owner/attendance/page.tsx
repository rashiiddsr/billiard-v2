'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { asArray } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CalendarCheck, Clock, MapPin, Settings, Plus, Edit2, Trash2,
  X, CheckCircle, AlertTriangle, XCircle, Users, Filter,
} from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';

interface AttendanceRecord {
  id: string;
  checkInAt: string | null;
  distanceMeters: number | null;
  status: 'ON_TIME' | 'LATE' | 'EARLY' | 'REJECTED' | 'ABSENT' | 'EXCUSED';
  notes: string | null;
  user: { id: string; name: string; role: string };
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
}

interface WorkShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  earlyWindowMinutes: number;
  lateToleranceMinutes: number;
  isActive: boolean;
}

interface AttendanceSetting {
  venueName?: string;
  locationLat: number;
  locationLng: number;
  radiusMeters: number;
}

type Tab = 'records' | 'shifts' | 'settings';

const statusBadge = {
  ON_TIME:  { label: 'Tepat Waktu', cls: 'badge-success',  icon: CheckCircle },
  LATE:     { label: 'Terlambat',   cls: 'badge-warning',  icon: AlertTriangle },
  EARLY:    { label: 'Terlalu Awal', cls: 'badge-info',    icon: Clock },
  REJECTED: { label: 'Ditolak',     cls: 'badge-danger',   icon: XCircle },
  ABSENT:   { label: 'Tidak Hadir', cls: 'badge-danger',   icon: XCircle },
  EXCUSED:  { label: 'Tidak Hadir (Izin/Sakit)', cls: 'badge-warning', icon: AlertTriangle },
};

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('records');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [setting, setSetting] = useState<AttendanceSetting | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter records
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Shift modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('19:00');
  const [shiftEnd, setShiftEnd] = useState('22:00');
  const [earlyMin, setEarlyMin] = useState(30);
  const [lateMin, setLateMin] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  // Setting modal
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(1000);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/reports/daily', { params: { date: filterDate } });
      setRecords(res.data.data);
    } catch {
      toast.error('Gagal memuat absensi');
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  const loadShifts = useCallback(async () => {
    const res = await api.get('/attendance/shifts', { params: { includeInactive: 'true' } });
    setShifts(asArray(res.data));
  }, []);

  const loadSetting = useCallback(async () => {
    const res = await api.get('/attendance/setting').catch(() => ({ data: null }));
    setSetting(res.data);
  }, []);

  useEffect(() => {
    if (tab === 'records') loadRecords();
    if (tab === 'shifts') loadShifts();
    if (tab === 'settings') loadSetting();
  }, [tab, loadRecords, loadShifts, loadSetting]);

  // Stats for the day
  const onTime   = records.filter((r) => r.status === 'ON_TIME').length;
  const late     = records.filter((r) => r.status === 'LATE').length;
  const absent = records.filter((r) => ['ABSENT', 'EXCUSED'].includes(r.status)).length;

  // Shift CRUD
  const openCreateShift = () => {
    setEditShiftId(null); setShiftName(''); setShiftStart('19:00');
    setShiftEnd('22:00'); setEarlyMin(30); setLateMin(30);
    setShowShiftModal(true);
  };

  const openEditShift = (s: WorkShift) => {
    setEditShiftId(s.id); setShiftName(s.name); setShiftStart(s.startTime);
    setShiftEnd(s.endTime); setEarlyMin(s.earlyWindowMinutes); setLateMin(s.lateToleranceMinutes);
    setShowShiftModal(true);
  };

  const handleShiftSubmit = async () => {
    if (!shiftName.trim()) { toast.error('Nama shift wajib diisi'); return; }
    setSubmitting(true);
    try {
      const data = { name: shiftName, startTime: shiftStart, endTime: shiftEnd, earlyWindowMinutes: earlyMin, lateToleranceMinutes: lateMin };
      if (editShiftId) {
        await api.patch(`/attendance/shifts/${editShiftId}`, data);
        toast.success('Shift diperbarui');
      } else {
        await api.post('/attendance/shifts', data);
        toast.success('Shift dibuat');
      }
      setShowShiftModal(false); loadShifts();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan shift');
    } finally { setSubmitting(false); }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Hapus shift ini?')) return;
    try {
      await api.delete(`/attendance/shifts/${id}`);
      toast.success('Shift dihapus'); loadShifts();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal menghapus'); }
  };

  // Setting
  const openSetting = () => {
    setVenueName(setting?.venueName || '');
    setLat(String(setting?.locationLat || ''));
    setLng(String(setting?.locationLng || ''));
    setRadius(setting?.radiusMeters || 1000);
    setShowSettingModal(true);
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)); toast.success('Lokasi berhasil diambil'); },
      () => toast.error('Gagal mendapatkan lokasi GPS'),
    );
  };

  const handleSettingSubmit = async () => {
    if (!lat || !lng) { toast.error('Isi koordinat lokasi'); return; }
    setSubmitting(true);
    try {
      const res = await api.patch('/attendance/setting', {
        venueName: venueName || undefined,
        locationLat: parseFloat(lat),
        locationLng: parseFloat(lng),
        radiusMeters: radius,
      });
      setSetting(res.data); setShowSettingModal(false);
      toast.success('Setting lokasi disimpan');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Absensi</h1>
          <p className="page-subtitle">Laporan kehadiran & konfigurasi sistem</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {([
          { key: 'records', label: 'Laporan Absensi', icon: CalendarCheck },
          { key: 'shifts', label: 'Shift Kerja', icon: Clock },
          { key: 'settings', label: 'Setting Lokasi', icon: MapPin },
        ] as Array<{ key: Tab; label: string; icon: any }>).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600,
              color: tab === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: tab === key ? '2px solid var(--color-gold)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Records ─────────────────────────────────── */}
      {tab === 'records' && (
        <div>
          {/* Stats */}
          <div className="grid-3 mb-4">
            <div className="stat-card">
              <div className="stat-card-icon"><CheckCircle size={20} /></div>
              <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{onTime}</div>
              <div className="stat-card-label">Tepat Waktu</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon"><AlertTriangle size={20} /></div>
              <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>{late}</div>
              <div className="stat-card-label">Terlambat</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon"><XCircle size={20} /></div>
              <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{absent}</div>
              <div className="stat-card-label">Tidak Hadir</div>
            </div>
          </div>

          {/* Filter */}
          <div className="card card-padded mb-4" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="date"
              className="form-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Shift</th>
                    <th>Jam Check-in</th>
                    <th>Jarak</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Memuat...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      Tidak ada data absensi pada tanggal ini
                    </td></tr>
                  ) : records.map((r) => {
                    const cfg = statusBadge[r.status];
                    const Icon = cfg.icon;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.user.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{r.user.role.toLowerCase()}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.shift?.name || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.shift ? `${r.shift.startTime}–${r.shift.endTime}` : '-'}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 14 }}>
                          {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {r.distanceMeters !== null ? `${r.distanceMeters}m` : '—'}
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', gap: 4 }}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Shifts ──────────────────────────────────── */}
      {tab === 'shifts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={openCreateShift}>
              <Plus size={16} /> Tambah Shift
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shifts.map((s) => (
              <div key={s.id} className="card card-padded" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    ⏰ {s.startTime} – {s.endTime} &nbsp;·&nbsp;
                    Window absen: {s.earlyWindowMinutes} menit sebelum s/d {s.lateToleranceMinutes} menit setelah jam masuk
                  </div>
                </div>
                <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {s.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditShift(s)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteShift(s.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {shifts.length === 0 && (
              <div className="card card-padded empty-state">
                <div className="empty-state-icon"><Clock size={24} /></div>
                <div>Belum ada shift kerja</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Settings ────────────────────────────────── */}
      {tab === 'settings' && (
        <div>
          <div className="card card-padded">
            <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--color-primary)' }}>
              Lokasi & Radius Absensi
            </h3>
            {setting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MapPin size={20} style={{ color: 'var(--color-gold)', marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{setting.venueName || 'Lokasi Venue'}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {Number(setting.locationLat).toFixed(6)}, {Number(setting.locationLng).toFixed(6)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Radius: <strong>{setting.radiusMeters}m</strong>
                    </div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={openSetting}>
                  <Settings size={14} /> Edit Setting
                </button>
              </div>
            ) : (
              <div>
                <div className="alert alert-warning" style={{ marginBottom: 14 }}>
                  Setting lokasi absensi belum dikonfigurasi. Karyawan tidak bisa absen.
                </div>
                <button className="btn btn-primary" onClick={openSetting}>
                  <Settings size={15} /> Konfigurasi Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Shift */}
      {showShiftModal && (
        <ModalPortal>
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3 className="card-title">{editShiftId ? 'Edit Shift' : 'Tambah Shift'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowShiftModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Shift <span className="required">*</span></label>
                <input className="form-input" placeholder="contoh: Shift Malam" value={shiftName} onChange={(e) => setShiftName(e.target.value)} autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Jam Masuk <span className="required">*</span></label>
                  <input type="time" className="form-input" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jam Selesai <span className="required">*</span></label>
                  <input type="time" className="form-input" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Toleransi Awal (menit)</label>
                  <input type="number" className="form-input" min={0} max={120} value={earlyMin} onChange={(e) => setEarlyMin(Number(e.target.value))} />
                  <div className="form-hint">Boleh absen X menit sebelum jam masuk</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Toleransi Terlambat (menit)</label>
                  <input type="number" className="form-input" min={0} max={120} value={lateMin} onChange={(e) => setLateMin(Number(e.target.value))} />
                  <div className="form-hint">Batas ON_TIME setelah jam masuk</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowShiftModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleShiftSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal Setting */}
      {showSettingModal && (
        <ModalPortal>
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3 className="card-title">Setting Lokasi Absensi</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSettingModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Venue</label>
                <input className="form-input" placeholder="contoh: Billiard Center v-luxe" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Latitude <span className="required">*</span></label>
                  <input className="form-input" placeholder="-6.xxxxx" value={lat} onChange={(e) => setLat(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude <span className="required">*</span></label>
                  <input className="form-input" placeholder="106.xxxxx" value={lng} onChange={(e) => setLng(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-outline btn-sm mb-3" onClick={getCurrentLocation}>
                <MapPin size={13} /> Gunakan Lokasi Saya Sekarang
              </button>
              <div className="form-group">
                <label className="form-label">Radius Maksimum (meter)</label>
                <input type="number" className="form-input" min={50} max={50000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
                <div className="form-hint">Absensi dari luar radius akan DITOLAK</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSettingModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSettingSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan Setting'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
