import React from 'react'
export default function Purchase({materials}){
  const low = materials.filter(m => m.stock < m.reorder)
  return (
    <div>
      <div className="card">
        <h3>Purchase Management</h3>
        <h4>Materials below reorder level</h4>
        <table>
          <thead><tr><th>Material</th><th>Stock</th><th>Reorder</th></tr></thead>
          <tbody>{low.map(m=> <tr key={m.code}><td>{m.code} - {m.name}</td><td>{m.stock}</td><td>{m.reorder}</td></tr>)}</tbody>
        </table>
        <div style={{marginTop:8}} className="muted small">You can auto-generate PRs from Production planning view when shortages are detected.</div>
      </div>
    </div>
  )
}
