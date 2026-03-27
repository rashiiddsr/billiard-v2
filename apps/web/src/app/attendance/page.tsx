'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Navigation } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  earlyWindowMinutes: number;
  lateToleranceMinutes: number;
}

interface CheckInResult {
  record: {
    id: string;
    status: 'ON_TIME' | 'LATE' | 'EARLY' | 'REJECTED';
    checkInAt: string;
    distanceMeters: number | null;
    shift: { name: string; startTime: string; endTime: string };
  };
  distanceMeters: number | null;
  radiusMeters: number;
  message: string;
}

const statusConfig = {
  ON_TIME: {
    icon: CheckCircle,
    label: 'Tepat Waktu',
    className: 'on-time',
    color: 'var(--color-success)',
  },
  LATE: {
    icon: AlertTriangle,
    label: 'Terlambat',
    className: 'late',
    color: 'var(--color-warning)',
  },
  EARLY: {
    icon: Clock,
    label: 'Terlalu Awal',
    className: 'early',
    color: 'var(--color-info)',
  },
  REJECTED: {
    icon: XCircle,
    label: 'Ditolak — Di Luar Area',
    className: 'rejected',
    color: 'var(--color-danger)',
  },
};

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update jam setiap detik
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load shift aktif
  useEffect(() => {
    if (!user) return;
    setLoadingShifts(true);
    api.get('/attendance/shifts/active-now')
      .then((r) => {
        setShifts(r.data);
        if (r.data.length === 1) setSelectedShift(r.data[0].id);
      })
      .catch(() => {
        // Fallback: semua shift
        api.get('/attendance/shifts')
          .then((r) => {
            setShifts(r.data);
            if (r.data.length === 1) setSelectedShift(r.data[0].id);
          })
          .catch(() => setError('Gagal memuat shift kerja'));
      })
      .finally(() => setLoadingShifts(false));
  }, [user]);

  const handleCheckIn = async () => {
    if (!selectedShift) {
      setError('Pilih shift kerja terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');
    setGeoError('');

    const performCheckIn = async (lat?: number, lng?: number) => {
      try {
        const res = await api.post('/attendance/check-in', {
          shiftId: selectedShift,
          lat,
          lng,
        });
        setResult(res.data);
      } catch (e: any) {
        const msg = e?.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Gagal melakukan absensi'));
      } finally {
        setLoading(false);
      }
    };

    // Minta GPS
    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung GPS. Absensi tetap dilanjutkan tanpa lokasi.');
      await performCheckIn();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await performCheckIn(pos.coords.latitude, pos.coords.longitude);
      },
      async (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Izin GPS ditolak. Absensi tetap dilanjutkan, tetapi bisa ditolak jika lokasi diperlukan.');
        } else {
          setGeoError('Gagal mendapatkan lokasi GPS. Melanjutkan tanpa GPS...');
        }
        await performCheckIn();
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  if (authLoading) {
    return (
      <div className="attendance-page">
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-gold)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="attendance-page">
        <div className="attendance-card">
          <div className="attendance-logo">🎱 Billiard POS</div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Silakan login terlebih dahulu untuk absensi
          </p>
          <a href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Login
          </a>
        </div>
      </div>
    );
  }

  if (!['MANAGER', 'CASHIER'].includes(user.role)) {
    return (
      <div className="attendance-page">
        <div className="attendance-card">
          <div className="attendance-logo">🎱 Billiard POS</div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Absensi hanya tersedia untuk akun Manager dan Kasir.
          </p>
          <a
            href={user.role === 'OWNER' || user.role === 'MEMBER' ? '/owner/dashboard' : '/login'}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="attendance-page">
      <div className="attendance-card">
        {/* Header */}
        <div className="attendance-logo">🎱 Billiard POS</div>
        <p style={{ fontSize: 12, color: 'var(--color-text-light)', marginBottom: 28 }}>
          Sistem Absensi Karyawan
        </p>

        {/* Profil karyawan */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--color-gold-pale)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: 24,
          textAlign: 'left',
        }}>
          <div className="sidebar-user-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {user.role.toLowerCase()}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {result ? (
          /* Hasil absensi */
          <div>
            <div className={`attendance-result ${statusConfig[result.record.status].className}`}>
              {(() => {
                const cfg = statusConfig[result.record.status];
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon size={36} style={{ color: cfg.color, margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: 'var(--color-text)' }}>
                      {result.record.shift.name} · {result.record.shift.startTime}–{result.record.shift.endTime}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, color: 'var(--color-text-muted)' }}>
                      Check-in: {new Date(result.record.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {result.distanceMeters !== null && (
                      <div style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                        <MapPin size={12} />
                        {result.distanceMeters}m dari lokasi (radius {result.radiusMeters}m)
                      </div>
                    )}
                    <div style={{ fontSize: 13, marginTop: 10, color: 'var(--color-text)' }}>{result.message}</div>
                  </>
                );
              })()}
            </div>
            <button
              className="btn btn-outline"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => setResult(null)}
            >
              Kembali
            </button>
          </div>
        ) : (
          /* Form absensi */
          <div>
            {/* Pilih shift */}
            {loadingShifts ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-muted)' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : shifts.length === 0 ? (
              <div className="alert alert-warning">
                <Clock size={16} />
                <span>Tidak ada shift aktif saat ini. Pastikan waktu sekarang masuk dalam window absensi shift.</span>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Shift Kerja</label>
                {shifts.length === 1 ? (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--color-gold-pale)',
                    border: '1.5px solid var(--color-gold)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                  }}>
                    {shifts[0].name} · {shifts[0].startTime}–{shifts[0].endTime}
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                  >
                    <option value="">-- Pilih shift --</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime}–{s.endTime})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* GPS notice */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: 12, color: 'var(--color-text-muted)',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              marginBottom: 16,
            }}>
              <Navigation size={13} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Saat absen, browser akan meminta izin GPS untuk verifikasi lokasi Anda.</span>
            </div>

            {geoError && (
              <div className="alert alert-warning" style={{ fontSize: 12 }}>
                <AlertTriangle size={14} />
                <span>{geoError}</span>
              </div>
            )}

            {error && (
              <div className="alert alert-danger" style={{ fontSize: 12 }}>
                <XCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center' }}
              onClick={handleCheckIn}
              disabled={loading || shifts.length === 0}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</>
              ) : (
                <><CheckCircle size={18} /> Absen Sekarang</>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
