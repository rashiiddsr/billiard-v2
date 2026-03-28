'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, billingApi, packagesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Play, Square, Plus, Minus, Search, User, Users,
  RefreshCw, X, ArrowRightLeft,
} from 'lucide-react';

interface Table {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  hourlyRate: string;
  isActive: boolean;
  billingSessions: ActiveSession[];
}

interface ActiveSession {
  id: string;
  tableId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalAmount: string;
  rateType: string;
  status: string;
  guestName?: string | null;
  member?: { id: string; name: string; memberNumber: string } | null;
  createdBy: { name: string };
  elapsedMinutes?: number;
  temporaryAmount?: string;
}

interface Member {
  id: string; name: string; memberNumber: string; phoneNumber: string;
}

interface Package {
  id: string; name: string; price: string;
  durationMinutes: number; targetHourlyRate: string;
  items?: Array<{ id: string; type: 'BILLING' | 'MENU_ITEM'; quantity: number; menuItem?: { name: string } | null }>;
}

type ModalType = 'start' | 'extend' | 'stop' | 'move' | null;

export default function BillingPage() {
  const [tables, setTables]   = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<ModalType>(null);
  const [sel, setSel]         = useState<Table | null>(null);
  const [pkgs, setPkgs]       = useState<Package[]>([]);

  // Start form state
  const [guestType, setGuestType]         = useState<'guest'|'member'>('guest');
  const [guestName, setGuestName]         = useState('');
  const [memberQ, setMemberQ]             = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selMember, setSelMember]         = useState<Member | null>(null);
  const [rateType, setRateType]           = useState<'HOURLY'|'FLEXIBLE'|'PACKAGE'>('HOURLY');
  const [duration, setDuration]           = useState(60);
  const [selPkg, setSelPkg]               = useState<Package | null>(null);

  // Extend
  const [extMin, setExtMin]   = useState(60);
  const [extPkg, setExtPkg]   = useState<Package | null>(null);

  // Move
  const [moveTo, setMoveTo] = useState('');

  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/tables'),
        api.get('/billing/sessions/active'),
      ]);
      const activeMap = new Map<string, ActiveSession>();
      (aRes.data as ActiveSession[]).forEach((s) => activeMap.set(s.tableId, s));
      setTables(tRes.data.map((t: any) => ({
        ...t,
        billingSessions: activeMap.has(t.id) ? [activeMap.get(t.id)!] : [],
      })));
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const openStart = async (t: Table) => {
    setSel(t);
    setGuestType('guest'); setGuestName(''); setMemberQ('');
    setMemberResults([]); setSelMember(null);
    setRateType('HOURLY'); setDuration(60); setSelPkg(null);
    try {
      const res = await packagesApi.active();
      setPkgs((res as Package[]).filter(p => parseFloat(p.targetHourlyRate) === parseFloat(t.hourlyRate)));
    } catch { setPkgs([]); }
    setModal('start');
  };

  const openStop   = (t: Table) => { setSel(t); setModal('stop'); };
  const openExtend = async (t: Table) => {
    setSel(t); setExtMin(60); setExtPkg(null);
    try { const r = await packagesApi.active(); setPkgs((r as Package[]).filter(p => parseFloat(p.targetHourlyRate) === parseFloat(t.hourlyRate))); }
    catch { setPkgs([]); }
    setModal('extend');
  };
  const openMove = (t: Table) => { setSel(t); setMoveTo(''); setModal('move'); };
  const close    = () => { setModal(null); setSel(null); setBusy(false); };

  const searchMembers = async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get('/members/search', { params: { q } }); setMemberResults(r.data); } catch {}
  };

  const handleStart = async () => {
    if (!sel) return;
    if (guestType === 'guest' && !guestName.trim()) { toast.error('Isi nama tamu'); return; }
    if (guestType === 'member' && !selMember)       { toast.error('Pilih member'); return; }
    if (rateType === 'PACKAGE' && !selPkg)          { toast.error('Pilih paket billing'); return; }
    setBusy(true);
    try {
      await billingApi.createSession({
        tableId: sel.id,
        durationMinutes: selPkg ? selPkg.durationMinutes : duration,
        rateType, billingPackageId: selPkg?.id,
        guestName: guestType === 'guest' ? guestName.trim() : undefined,
        memberId:  guestType === 'member' ? selMember?.id  : undefined,
      });
      toast.success(`Billing dimulai — ${sel.name}`); close(); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleStop = async () => {
    if (!sel?.billingSessions[0]) return;
    setBusy(true);
    try { await billingApi.stopSession(sel.billingSessions[0].id); toast.success('Billing dihentikan'); close(); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleExtend = async () => {
    if (!sel?.billingSessions[0]) return;
    setBusy(true);
    try {
      await billingApi.extendSession(sel.billingSessions[0].id, extPkg ? extPkg.durationMinutes : extMin, extPkg?.id);
      toast.success('Billing diperpanjang'); close(); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const handleMove = async () => {
    if (!sel?.billingSessions[0] || !moveTo) { toast.error('Pilih meja tujuan'); return; }
    setBusy(true);
    try { await billingApi.moveSession(sel.billingSessions[0].id, moveTo); toast.success('Dipindahkan'); close(); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setBusy(false); }
  };

  const sess = (t: Table) => t.billingSessions[0] ?? null;
  const available = tables.filter(t => t.status === 'AVAILABLE' && t.isActive).length;
  const occupied  = tables.filter(t => t.status === 'OCCUPIED').length;

  const elapsed = (s: ActiveSession) => {
    const m = s.elapsedMinutes ?? Math.ceil((Date.now() - new Date(s.startTime).getTime()) / 60000);
    const h = Math.floor(m / 60); const mn = m % 60;
    return h > 0 ? `${h}j ${mn}m` : `${mn}m`;
  };

  const Overlay = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      {children}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing Meja</h1>
          <p className="page-subtitle">{available} tersedia · {occupied} terpakai</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} style={loading ? { animation:'spin 0.8s linear infinite' } : {}} /> Refresh
        </button>
      </div>

      <div className="table-grid">
        {tables.map(t => {
          const s = sess(t);
          const cls = t.status === 'AVAILABLE' ? 'available' : t.status === 'OCCUPIED' ? 'occupied' : 'maintenance';
          const name = s?.member?.name || s?.guestName || null;

          return (
            <div key={t.id} className={`table-card ${cls}`}>
              <div className="table-name">{t.name}</div>
              <div className="table-rate">Rp {Number(t.hourlyRate).toLocaleString('id-ID')}/jam</div>
              <div className="table-status-dot" />

              {s && (
                <div style={{ marginTop:8, fontSize:11, color:'var(--color-text-muted)' }}>
                  <div style={{ fontWeight:600, color:'var(--color-text)', fontSize:12, marginBottom:2 }}>
                    {name || '—'}
                    {s.member && <span className="badge badge-gold" style={{ marginLeft:4, fontSize:9 }}>M</span>}
                  </div>
                  <div>{elapsed(s)}</div>
                  {s.rateType === 'FLEXIBLE' && s.temporaryAmount && (
                    <div style={{ color:'var(--color-gold-hover)', fontWeight:600 }}>
                      ~Rp {Number(s.temporaryAmount).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display:'flex', gap:4, marginTop:10, justifyContent:'center', flexWrap:'wrap' }}>
                {t.status === 'AVAILABLE' && t.isActive && (
                  <button className="btn btn-success btn-sm" onClick={() => openStart(t)}>
                    <Play size={12} /> Mulai
                  </button>
                )}
                {t.status === 'OCCUPIED' && s && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => openExtend(t)} title="Perpanjang"><Plus size={12} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openMove(t)} title="Pindah"><ArrowRightLeft size={12} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => openStop(t)}><Square size={12} /> Stop</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Start */}
      {modal === 'start' && sel && (
        <Overlay>
          <div className="card" style={{ width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'white', zIndex:1, paddingBottom:14 }}>
              <h3 className="card-title">Mulai Billing — {sel.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Tipe Tamu</label>
                <div style={{ display:'flex', gap:8 }}>
                  <button className={`btn btn-sm ${guestType==='guest'?'btn-dark':'btn-outline'}`} onClick={() => setGuestType('guest')} style={{ flex:1 }}><User size={13} /> Tamu</button>
                  <button className={`btn btn-sm ${guestType==='member'?'btn-dark':'btn-outline'}`} onClick={() => setGuestType('member')} style={{ flex:1 }}><Users size={13} /> Member</button>
                </div>
              </div>

              {guestType === 'guest' ? (
                <div className="form-group">
                  <label className="form-label">Nama Tamu <span className="required">*</span></label>
                  <input className="form-input" placeholder="Nama tamu" value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Cari Member <span className="required">*</span></label>
                  {selMember ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--color-gold-pale)', border:'1.5px solid var(--color-gold)', borderRadius:'var(--radius-md)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600 }}>{selMember.name}</div>
                        <div style={{ fontSize:12, color:'var(--color-text-muted)' }}>{selMember.memberNumber} · {selMember.phoneNumber}</div>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelMember(null)}><X size={13} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position:'relative' }}>
                        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-light)' }} />
                        <input className="form-input" placeholder="Nama, no HP, atau nomor member..." value={memberQ}
                          onChange={e => { setMemberQ(e.target.value); searchMembers(e.target.value); }} style={{ paddingLeft:32 }} />
                      </div>
                      {memberResults.length > 0 && (
                        <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', marginTop:4, overflow:'hidden' }}>
                          {memberResults.map(m => (
                            <button key={m.id} style={{ display:'flex', flexDirection:'column', padding:'9px 14px', width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid var(--color-border-soft)' }}
                              onClick={() => { setSelMember(m); setMemberQ(''); setMemberResults([]); }}>
                              <span style={{ fontWeight:600, fontSize:13 }}>{m.name}</span>
                              <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>{m.memberNumber} · {m.phoneNumber}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Tipe Billing</label>
                <div style={{ display:'flex', gap:8 }}>
                  <button className={`btn btn-sm ${rateType==='HOURLY'?'btn-dark':'btn-outline'}`} onClick={() => { setRateType('HOURLY'); setSelPkg(null); }} style={{ flex:1 }}>Per Jam</button>
                  <button className={`btn btn-sm ${rateType==='FLEXIBLE'?'btn-dark':'btn-outline'}`} onClick={() => { setRateType('FLEXIBLE'); setSelPkg(null); }} style={{ flex:1 }}>Main Bebas</button>
                  <button className={`btn btn-sm ${rateType==='PACKAGE'?'btn-dark':'btn-outline'}`} onClick={() => { setRateType('PACKAGE'); }} style={{ flex:1 }}>Paket</button>
                </div>
              </div>

              {rateType === 'HOURLY' && !selPkg && (
                <div className="form-group">
                  <label className="form-label">Durasi</label>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button className="btn btn-outline btn-icon" onClick={() => setDuration(Math.max(60, duration - 60))} disabled={duration <= 60}><Minus size={14} /></button>
                    <div style={{ flex:1, textAlign:'center', fontWeight:700, fontSize:16 }}>{duration / 60} Jam</div>
                    <button className="btn btn-outline btn-icon" onClick={() => setDuration(duration + 60)}><Plus size={14} /></button>
                  </div>
                  <div style={{ textAlign:'center', fontSize:13, color:'var(--color-text-muted)', marginTop:4 }}>
                    Total: Rp {(Number(sel.hourlyRate) * (duration / 60)).toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              {pkgs.length > 0 && (rateType === 'HOURLY' || rateType === 'PACKAGE') && (
                <div className="form-group">
                  <label className="form-label">Pilih Paket {rateType === 'PACKAGE' ? <span className="required">*</span> : '(opsional)'}</label>
                  {pkgs.map(p => (
                    <button key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: selPkg?.id === p.id ? 'var(--color-gold-pale)' : 'var(--color-surface-2)', border:`1.5px solid ${selPkg?.id === p.id ? 'var(--color-gold)' : 'var(--color-border)'}`, borderRadius:'var(--radius-md)', cursor:'pointer', width:'100%', marginBottom:6, textAlign:'left' }}
                      onClick={() => setSelPkg(selPkg?.id === p.id && rateType !== 'PACKAGE' ? null : p)}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{p.durationMinutes} menit</div>
                        {(p.items || []).filter((i) => i.type === 'MENU_ITEM').length > 0 && (
                          <div style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:3 }}>
                            Bundle: {(p.items || [])
                              .filter((i) => i.type === 'MENU_ITEM')
                              .map((i) => `${i.menuItem?.name || 'Menu'} x${i.quantity}`)
                              .join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight:700 }}>Rp {Number(p.price).toLocaleString('id-ID')}</div>
                    </button>
                  ))}
                  {rateType === 'PACKAGE' && !selPkg && (
                    <div style={{ fontSize:12, color:'var(--color-danger)', marginTop:4 }}>Silakan pilih paket.</div>
                  )}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end', position:'sticky', bottom:0, background:'var(--color-surface-2)' }}>
              <button className="btn btn-ghost" onClick={close}>Batal</button>
              <button className="btn btn-success" onClick={handleStart} disabled={busy}>
                {busy ? 'Memproses...' : <><Play size={15} /> Mulai Billing</>}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Modal Stop */}
      {modal === 'stop' && sel && (
        <Overlay>
          <div className="card" style={{ width:'100%', maxWidth:360, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="card-header"><h3 className="card-title">Stop Billing — {sel.name}</h3></div>
            <div className="card-body">
              {sess(sel) && (() => {
                const s = sess(sel)!;
                const name = s.member?.name || s.guestName || '—';
                const m = Math.ceil((Date.now() - new Date(s.startTime).getTime()) / 60000);
                const h = Math.floor(m / 60), mn = m % 60;
                return (
                  <div style={{ background:'var(--color-gold-pale)', borderRadius:'var(--radius-md)', padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ fontWeight:700 }}>{name}</div>
                    <div style={{ fontSize:12, color:'var(--color-text-muted)' }}>Durasi: {h > 0 ? `${h}j ` : ''}{mn}m</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--color-primary)', marginTop:4 }}>
                      Rp {Number(s.rateType === 'FLEXIBLE' ? (s.temporaryAmount || s.totalAmount) : s.totalAmount).toLocaleString('id-ID')}
                    </div>
                  </div>
                );
              })()}
              <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>Lanjutkan ke Checkout untuk proses pembayaran.</p>
            </div>
            <div className="card-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={close}>Batal</button>
              <button className="btn btn-danger" onClick={handleStop} disabled={busy}>
                {busy ? 'Menghentikan...' : <><Square size={14} /> Stop</>}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Modal Extend */}
      {modal === 'extend' && sel && (
        <Overlay>
          <div className="card" style={{ width:'100%', maxWidth:400, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 className="card-title">Perpanjang — {sel.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="card-body">
              {!extPkg && (
                <div className="form-group">
                  <label className="form-label">Tambah Durasi</label>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button className="btn btn-outline btn-icon" onClick={() => setExtMin(Math.max(60, extMin - 60))} disabled={extMin <= 60}><Minus size={14} /></button>
                    <div style={{ flex:1, textAlign:'center', fontWeight:700, fontSize:16 }}>{extMin / 60} Jam</div>
                    <button className="btn btn-outline btn-icon" onClick={() => setExtMin(extMin + 60)}><Plus size={14} /></button>
                  </div>
                  <div style={{ textAlign:'center', fontSize:13, color:'var(--color-text-muted)', marginTop:4 }}>
                    + Rp {(Number(sel.hourlyRate) * (extMin / 60)).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
              {pkgs.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Atau pilih paket</label>
                  {pkgs.map(p => (
                    <button key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: extPkg?.id === p.id ? 'var(--color-gold-pale)' : 'var(--color-surface-2)', border:`1.5px solid ${extPkg?.id === p.id ? 'var(--color-gold)' : 'var(--color-border)'}`, borderRadius:'var(--radius-md)', cursor:'pointer', width:'100%', marginBottom:6, textAlign:'left' }}
                      onClick={() => setExtPkg(extPkg?.id === p.id ? null : p)}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{p.durationMinutes / 60} jam</div>
                      </div>
                      <div style={{ fontWeight:700 }}>Rp {Number(p.price).toLocaleString('id-ID')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={close}>Batal</button>
              <button className="btn btn-primary" onClick={handleExtend} disabled={busy}>{busy ? 'Memproses...' : 'Perpanjang'}</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Modal Move */}
      {modal === 'move' && sel && (
        <Overlay>
          <div className="card" style={{ width:'100%', maxWidth:360, maxHeight:'90vh', overflowY:'auto' }}>
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 className="card-title">Pindah Meja</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Meja Tujuan</label>
                <select className="form-select" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                  <option value="">-- Pilih meja --</option>
                  {tables.filter(t => t.status === 'AVAILABLE' && t.id !== sel.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name} — Rp {Number(t.hourlyRate).toLocaleString('id-ID')}/jam</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize:12, color:'var(--color-text-muted)' }}>Tarif meja tujuan harus sama kecuali Owner Lock.</p>
            </div>
            <div className="card-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={close}>Batal</button>
              <button className="btn btn-primary" onClick={handleMove} disabled={busy || !moveTo}>
                {busy ? 'Memindahkan...' : <><ArrowRightLeft size={14} /> Pindahkan</>}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
