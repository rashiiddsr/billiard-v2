'use client';
import { useState, useEffect } from 'react';
import { companyApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';

export default function CompanyPage() {
  const [form, setForm] = useState({ name: '', address: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  useEffect(() => {
    companyApi.getProfile().then(p => { if (p) setForm({ name: p.name||'', address: p.address||'', phoneNumber: p.phoneNumber||'' }); }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await companyApi.updateProfile(form); toast.success('Profil perusahaan disimpan'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="page-header"><div><h1 className="page-title">Profil Perusahaan</h1></div></div>
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 14 }}><h3 className="card-title"><Building2 size={16} style={{ display:'inline',verticalAlign:'middle',marginRight:8 }}/>Informasi Bisnis</h3></div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          {loading ? <p>Memuat...</p> : (
            <>
              {[['name','Nama Usaha'],['address','Alamat'],['phoneNumber','No. Telepon']].map(([f,l])=>(
                <div key={f} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={(form as any)[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
