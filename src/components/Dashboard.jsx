import React from 'react'
export default function Dashboard({materials, productionLog, vendors}){
  const totalStock = materials.reduce((s,m)=>s+m.stock,0)
  const pendingQC = materials.reduce((s,m)=>s+(m.qcPending||0),0)
  const rejected = materials.reduce((s,m)=>s+(m.rejected||0),0)
  const pendingFG = productionLog.filter(p=>p.qcStatus==='Pending').length
  return (
    <div>
      <div className="card grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="card" style={{padding:12}}>
          <h4 style={{margin:0}}>Total Approved Stock</h4>
          <div className="muted" style={{fontSize:20,fontWeight:700,marginTop:6}}>{totalStock}</div>
        </div>
        <div className="card" style={{padding:12}}>
          <h4 style={{margin:0}}>Raw QC Pending</h4>
          <div className="muted" style={{fontSize:20,fontWeight:700,marginTop:6}}>{pendingQC}</div>
        </div>
        <div className="card" style={{padding:12}}>
          <h4 style={{margin:0}}>Rejected Qty</h4>
          <div className="muted" style={{fontSize:20,fontWeight:700,marginTop:6}}>{rejected}</div>
        </div>
        <div className="card" style={{padding:12}}>
          <h4 style={{margin:0}}>FG Pending QC</h4>
          <div className="muted" style={{fontSize:20,fontWeight:700,marginTop:6}}>{pendingFG}</div>
        </div>
      </div>

      <div className="card">
        <h4>Stock Alerts</h4>
        <div className="grid">
          {materials.filter(m=>m.stock < m.reorder).map(m=> (
            <div key={m.code} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{m.code} - {m.name}</div>
                <div className="right"><span className="badge warn">stock {m.stock} / reorder {m.reorder}</span></div>
              </div>
            </div>
          ))}
          {materials.filter(m=>m.qcPending>0).map(m=> (
            <div key={m.code} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{m.code} - {m.name}</div>
                <div className="right"><span className="badge">QC Pending {m.qcPending}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
