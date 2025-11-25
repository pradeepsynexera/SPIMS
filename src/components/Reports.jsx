import React from 'react'
export default function Reports({materials, productionLog, vendors}){
  return (
    <div>
      <div className="card">
        <h3>Reports & Dashboards</h3>
        <div style={{display:'flex',gap:12}}>
          <div style={{flex:1}}>
            <h4>Stock Summary</h4>
            <table>
              <thead><tr><th>Material</th><th>Stock</th><th>QC Pending</th><th>Rejected</th></tr></thead>
              <tbody>{materials.map(m=> <tr key={m.code}><td>{m.code}</td><td>{m.stock}</td><td>{m.qcPending}</td><td>{m.rejected}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{flex:1}}>
            <h4>Production Summary (last 10)</h4>
            <table>
              <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>QC</th></tr></thead>
              <tbody>{productionLog.slice(0,10).map(p=> <tr key={p.id}><td>{p.date}</td><td>{p.item}</td><td>{p.qty}</td><td>{p.qcStatus}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <h4>Vendor Performance (placeholder)</h4>
          <p className="muted small">This demo includes static vendor data. Integrate with deliveries and GRN history to compute on-time, quality rejects, returns, etc.</p>
          <table className="table-compact">
            <thead><tr><th>Vendor</th><th>Contact</th><th>Class</th><th>Payment</th></tr></thead>
            <tbody>{vendors.map(v=> <tr key={v.id}><td>{v.name}</td><td className="muted small">{v.contact}</td><td>{v.classification}</td><td className="muted small">{v.payment}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
