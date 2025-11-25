import React, { useState } from 'react'

export default function Vendors({vendors, setVendors, canEdit, notify}){
  const [form,setForm] = useState({id:'', name:'', contact:'', gst:'', payment:'', classification:''})
  function add(){ if(!form.id){ notify && notify('Add an ID','warn'); return } setVendors(v=>[{...form}, ...v]); setForm({id:'', name:'', contact:'', gst:'', payment:'', classification:''}); notify && notify('Vendor added','success') }
  return (
    <div>
      <div className="card">
        <h3>Vendor Master</h3>
        <div className="row">
          <input placeholder="ID" value={form.id} onChange={e=>setForm({...form,id:e.target.value})} />
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <input placeholder="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:8}}>
          <input placeholder="GST" value={form.gst} onChange={e=>setForm({...form,gst:e.target.value})} />
          <input placeholder="Payment terms" value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})} />
          <input placeholder="Classification" value={form.classification} onChange={e=>setForm({...form,classification:e.target.value})} />
          <div className="form-actions">
            <button className="btn primary" onClick={add} disabled={!canEdit}>Add Vendor</button>
            <button className="btn ghost" onClick={()=>setForm({id:'', name:'', contact:'', gst:'', payment:'', classification:''})}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Vendors</h4>
        <div className="grid">
          {vendors.map(v=> (
            <div key={v.id} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{v.name}</div>
                <div className="muted">{v.id} - {v.name}</div>
                <div className="right"><span className="badge">Class {v.classification || '-'}</span></div>
              </div>
              <div className="muted small" style={{marginTop:8}}>{v.contact}</div>
              <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center'}}>
                <div className="muted small">GST: {v.gst}</div>
                <div className="muted small">Payment: {v.payment}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
