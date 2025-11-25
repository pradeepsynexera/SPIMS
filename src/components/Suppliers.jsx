import React, { useState } from 'react'

export default function Suppliers({suppliers, setSuppliers, canEdit}){
  const [f,setF] = useState({id:'',name:'',contact:'',location:'',products:''})
  function add(){ setSuppliers(s=>[{...f, products: f.products.split(',').map(x=>x.trim()).filter(Boolean)}, ...s]); setF({id:'',name:'',contact:'',location:'',products:''}); }
  return (
    <div>
      <div className="card">
        <h3>Supplier Master</h3>
        <div className="row" style={{gap:10}}>
          <input placeholder="ID" value={f.id} onChange={e=>setF({...f,id:e.target.value})} />
          <input placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} />
          <input placeholder="Contact" value={f.contact} onChange={e=>setF({...f,contact:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:8}}>
          <input placeholder="Location" value={f.location} onChange={e=>setF({...f,location:e.target.value})} />
          <input placeholder="Products (comma)" value={f.products} onChange={e=>setF({...f,products:e.target.value})} />
          <div className="form-actions">
            <button className="btn primary" onClick={add} disabled={!canEdit}>Add Supplier</button>
            <button className="btn ghost" onClick={()=>setF({id:'',name:'',contact:'',location:'',products:''})}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Suppliers</h4>
        <div className="grid">
          {suppliers.map(s=> (
            <div key={s.id} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{s.name}</div>
                <div className="muted">({s.id})</div>
                <div className="right"><span className="badge">{s.location}</span></div>
              </div>
              <div className="muted small" style={{marginTop:8}}>{s.contact}</div>
              <div style={{marginTop:8}}>
                <strong>Products:</strong> {(s.products||[]).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
