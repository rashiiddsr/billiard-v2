'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CalendarCheck, CheckCircle, AlertTriangle, XCircle, Clock, Filter, Download } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  checkInAt: string;
  distanceMeters: number | null;
  status: 'ON_TIME' | 'LATE' | 'EARLY' | 'REJECTED';
  notes: string | null;
  user: { id: string; name: string; role: string };
  shift: { name: string; startTime: string; endTime: string };
}

const statusConfig = {
  ON_TIME:  { label: 'Tepat Waktu', cls: 'badge-success',  Icon: CheckCircle },
  LATE:     { label: 'Terlambat',   cls: 'badge-warning',  Icon: AlertTriangle },
  EARLY:    { label: 'Terlalu Awal',cls: 'badge-info',     Icon: Clock },
  REJECTED: { label: 'Ditolak',     cls: 'badge-danger',   Icon: XCircle },
};

export default function ManagerAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate: `${filterDate}T00:00:00`,
        endDate: `${filterDate}T23:59:59`,
        limit: 100,
      };
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/attendance/records', { params });
      setRecords(res.data.data);
    } catch {
      toast.error('Gagal memuat data absensi');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const onTime   = records.filter((r) => r.status === 'ON_TIME').length;
  const late     = records.filter((r) => r.status === 'LATE').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Absensi</h1>
          <p className="page-subtitle">
            {new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

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
          <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{rejected}</div>
          <div className="stat-card-label">Ditolak</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-padded mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="date"
          className="form-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ width: 'auto' }}
        />
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">Semua Status</option>
          <option value="ON_TIME">Tepat Waktu</option>
          <option value="LATE">Terlambat</option>
          <option value="EARLY">Terlalu Awal</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Shift</th>
                <th>Check-in</th>
                <th>Jarak</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  Tidak ada data absensi
                </td></tr>
              ) : records.map((r) => {
                const cfg = statusConfig[r.status];
                const { Icon } = cfg;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                        {r.user.role.toLowerCase()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.shift.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {r.shift.startTime}–{r.shift.endTime}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 14 }}>
                      {new Date(r.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {r.distanceMeters !== null ? `${r.distanceMeters}m` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 200 }}>
                      {r.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
