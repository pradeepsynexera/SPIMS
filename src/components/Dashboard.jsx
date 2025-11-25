import React from 'react'
export default function Dashboard({materials, productionLog, vendors}){
  const totalStock = materials.reduce((s,m)=>s+m.stock,0)
  const pendingQC = materials.reduce((s,m)=>s+(m.qcPending||0),0)
  const rejected = materials.reduce((s,m)=>s+(m.rejected||0),0)
  const pendingFG = productionLog.filter(p=>p.qcStatus==='Pending').length
  return (
    <div>
      <div className="card grid grid-4">
        <div className="card p-12">
          <h4 className="stat-title">Total Approved Stock</h4>
          <div className="muted stat-value">{totalStock}</div>
        </div>
        <div className="card p-12">
          <h4 className="stat-title">Raw QC Pending</h4>
          <div className="muted stat-value">{pendingQC}</div>
        </div>
        <div className="card p-12">
          <h4 className="stat-title">Rejected Qty</h4>
          <div className="muted stat-value">{rejected}</div>
        </div>
        <div className="card p-12">
          <h4 className="stat-title">FG Pending QC</h4>
          <div className="muted stat-value">{pendingFG}</div>
        </div>
      </div>

      <div className="card">
        <h4>Stock Alerts</h4>
        <div className="grid">
          {materials.filter(m=>m.stock < m.reorder).map(m=> (
            <div key={m.code} className="card p-10">
              <div className="flex-row">
                <div className="fw-700">{m.code} - {m.name}</div>
                <div className="right"><span className="badge warn">stock {m.stock} / reorder {m.reorder}</span></div>
              </div>
            </div>
          ))}
          {materials.filter(m=>m.qcPending>0).map(m=> (
            <div key={m.code} className="card p-10">
              <div className="flex-row">
                <div className="fw-700">{m.code} - {m.name}</div>
                <div className="right"><span className="badge">QC Pending {m.qcPending}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
