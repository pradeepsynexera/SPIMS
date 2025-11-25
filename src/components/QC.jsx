import React, { useState } from 'react'

export default function QC({ materials = [], inspectMaterial, productionLog = [], inspectFinishedGood, canQC, notify, confirm, user }) {
  const [detail, setDetail] = useState({ open: false, type: null, id: null })

  async function handleMaterialAction(m, approve) {
    if (!canQC) return
    if ((m.qcPending || 0) <= 0) {
      notify && notify('No QC pending for this material', 'warn')
      return
    }
    const verb = approve ? 'Approve' : 'Reject'
    const ok = confirm ? await confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`) : window.confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`)
    if (!ok) return
    inspectMaterial(m.code, m.qcPending, approve, user)
    notify && notify(`Material ${approve ? 'approved' : 'rejected'}`, 'success')
  }

  async function handleFinishedAction(p, approve) {
    if (!canQC) return
    const verb = approve ? 'Approve' : 'Reject'
    const ok = confirm ? await confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`) : window.confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`)
    if (!ok) return
    inspectFinishedGood(p.id, approve, user)
    notify && notify(`Finished good ${approve ? 'approved' : 'rejected'}`, 'success')
  }

  return (
    <div>
      <div className="card">
        <h3>Raw Material QC</h3>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>QC Pending</th>
              <th>Last Action</th>
              <th>Approve</th>
              <th>Reject</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const last = (m.qcHistory || [])[0]
              return (
                <tr key={m.code}>
                  <td>{m.code} - {m.name}</td>
                  <td>{m.qcPending}</td>
                  <td className="muted small">
                    {last ? `${last.action} by ${last.by} at ${new Date(last.at).toLocaleString()}` : '—'}
                  </td>
                  <td>
                    <button className="btn primary" onClick={() => handleMaterialAction(m, true)} disabled={!canQC || m.qcPending <= 0}>Approve</button>
                  </td>
                  <td>
                    <button className="btn warn" onClick={() => handleMaterialAction(m, false)} disabled={!canQC || m.qcPending <= 0}>Reject</button>
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => setDetail({ open: true, type: 'material', id: m.code })}>History</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Finished Goods QC</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>QC Status</th>
              <th>Last Action</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {productionLog.map((p) => {
              const last = (p.qcHistory || [])[0]
              return (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.item}</td>
                  <td>{p.qty}</td>
                  <td>{p.qcStatus}</td>
                  <td className="muted small">{last ? `${last.action} by ${last.by} at ${new Date(last.at).toLocaleString()}` : '—'}</td>
                  <td>
                    {p.qcStatus === 'Pending' && (
                      <>
                        <button className="btn" onClick={() => handleFinishedAction(p, true)} disabled={!canQC}>Approve</button>
                        <button className="btn warn" style={{ marginLeft: 8 }} onClick={() => handleFinishedAction(p, false)} disabled={!canQC}>Reject</button>
                      </>
                    )}
                    <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => setDetail({ open: true, type: 'product', id: p.id })}>History</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail.open && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: 18, borderRadius: 8, width: 'min(700px,96%)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>QC History</h4>
              <div className="right"><button className="btn ghost" onClick={() => setDetail({ open: false, type: null, id: null })}>Close</button></div>
            </div>
            <div style={{ marginTop: 12 }}>
              {detail.type === 'material' && (() => {
                const m = materials.find(x => x.code === detail.id)
                if (!m) return <div className="muted">Material not found</div>
                return (m.qcHistory && m.qcHistory.length > 0) ? (
                  <table>
                    <thead>
                      <tr><th>Action</th><th>By</th><th>When</th><th>Qty</th></tr>
                    </thead>
                    <tbody>
                      {m.qcHistory.map((h, i) => <tr key={i}><td>{h.action}</td><td>{h.by}</td><td>{new Date(h.at).toLocaleString()}</td><td>{h.qty || '-'}</td></tr>)}
                    </tbody>
                  </table>
                ) : <div className="muted">No QC history for this material.</div>
              })()}

              {detail.type === 'product' && (() => {
                const p = productionLog.find(x => x.id === detail.id)
                if (!p) return <div className="muted">Production entry not found</div>
                return (p.qcHistory && p.qcHistory.length > 0) ? (
                  <table>
                    <thead>
                      <tr><th>Action</th><th>By</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {p.qcHistory.map((h, i) => <tr key={i}><td>{h.action}</td><td>{h.by}</td><td>{new Date(h.at).toLocaleString()}</td></tr>)}
                    </tbody>
                  </table>
                ) : <div className="muted">No QC history for this production entry.</div>
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import React, { useState } from 'react'

export default function QC({materials, inspectMaterial, productionLog, inspectFinishedGood, canQC, notify, confirm, user}){
  const [detail, setDetail] = useState({open:false, type:null, id:null})

  async function handleMaterialAction(m, approve){
    if(!canQC) return
    if((m.qcPending||0) <= 0){ notify && notify('No QC pending for this material','warn'); return }
    const verb = approve ? 'Approve' : 'Reject'
    const ok = confirm ? await confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`) : window.confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`)
    if(!ok) return
    inspectMaterial(m.code, m.qcPending, approve, user)
    notify && notify(`Material ${approve ? 'approved' : 'rejected'}`,'success')
  }

  async function handleFinishedAction(p, approve){
    if(!canQC) return
    const verb = approve ? 'Approve' : 'Reject'
    const ok = confirm ? await confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`) : window.confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`)
    if(!ok) return
    inspectFinishedGood(p.id, approve, user)
    notify && notify(`Finished good ${approve ? 'approved' : 'rejected'}`,'success')
  }

  return (
    <div>
      <div className="card">
        <h3>Raw Material QC</h3>
        <table>
          <thead><tr><th>Material</th><th>QC Pending</th><th>Last Action</th><th>Approve</th><th>Reject</th><th>History</th></tr></thead>
          <tbody>
            {materials.map(m => {
              const last = (m.qcHistory||[])[0]
              return (
                <tr key={m.code}>
                  <td>{m.code} - {m.name}</td>
                  <td>{m.qcPending}</td>
                  <td className="muted small">{last ? `${last.action} by ${last.by} at ${last.at.split('T')[0]} ${last.at.split('T')[1].slice(0,8)}` : '—'}</td>
                  <td><button className="btn primary" onClick={()=>handleMaterialAction(m, true)} disabled={!canQC || m.qcPending<=0}>Approve</button></td>
                  <td><button className="btn warn" onClick={()=>handleMaterialAction(m, false)} disabled={!canQC || m.qcPending<=0}>Reject</button></td>
                  <td><button className="btn ghost" onClick={()=>setDetail({open:true, type:'material', id:m.code})}>History</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Finished Goods QC</h3>
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>QC Status</th><th>Last Action</th><th>Actions</th></tr></thead>
          <tbody>
            {productionLog.map(p => {
              const last = (p.qcHistory||[])[0]
              return (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.item}</td>
                  <td>{p.qty}</td>
                  <td>{p.qcStatus}</td>
                  <td className="muted small">{last ? `${last.action} by ${last.by} at ${last.at.split('T')[0]} ${last.at.split('T')[1].slice(0,8)}` : '—'}</td>
                  <td>
                    {p.qcStatus==='Pending' && (
                      <>
                        <button className="btn" onClick={()=>handleFinishedAction(p, true)} disabled={!canQC}>Approve</button>
                        <button className="btn warn" style={{marginLeft:8}} onClick={()=>handleFinishedAction(p, false)} disabled={!canQC}>Reject</button>
                      </>
                    )}
                    <button className="btn ghost" style={{marginLeft:8}} onClick={()=>setDetail({open:true, type:'product', id:p.id})}>History</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail.open && (
        <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000}}>
          <div style={{background:'#fff', padding:18, borderRadius:8, width:'min(700px,96%)', maxHeight:'80vh', overflowY:'auto'}}>
            <div style={{display:'flex', alignItems:'center'}}>
              <h4 style={{margin:0}}>QC History</h4>
              <div className="right"><button className="btn ghost" onClick={()=>setDetail({open:false, type:null, id:null})}>Close</button></div>
            </div>
            <div style={{marginTop:12}}>
              {detail.type==='material' && (()=>{
                const m = materials.find(x=>x.code===detail.id)
                if(!m) return <div className="muted">Material not found</div>
                import React, { useState } from 'react'

                export default function QC({materials, inspectMaterial, productionLog, inspectFinishedGood, canQC, notify, confirm, user}){
                  const [detail, setDetail] = useState({open:false, type:null, id:null})

                  async function handleMaterialAction(m, approve){
                    if(!canQC) return
                    if((m.qcPending||0) <= 0){ notify && notify('No QC pending for this material','warn'); return }
                    const verb = approve ? 'Approve' : 'Reject'
                    const ok = confirm ? await confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`) : window.confirm(`${verb} ${m.qcPending} ${m.uom} for ${m.code}?`)
                    if(!ok) return
                    inspectMaterial(m.code, m.qcPending, approve, user)
                    notify && notify(`Material ${approve ? 'approved' : 'rejected'}`,'success')
                  }

                  async function handleFinishedAction(p, approve){
                    if(!canQC) return
                    const verb = approve ? 'Approve' : 'Reject'
                    const ok = confirm ? await confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`) : window.confirm(`${verb} finished good ${p.item} (qty ${p.qty})?`)
                    if(!ok) return
                    inspectFinishedGood(p.id, approve, user)
                    notify && notify(`Finished good ${approve ? 'approved' : 'rejected'}`,'success')
                  }

                  return (
                    <div>
                      <div className="card">
                        <h3>Raw Material QC</h3>
                        <table>
                          <thead><tr><th>Material</th><th>QC Pending</th><th>Last Action</th><th>Approve</th><th>Reject</th><th>History</th></tr></thead>
                          <tbody>
                            {materials.map(m => {
                              const last = (m.qcHistory||[])[0]
                              return (
                                <tr key={m.code}>
                                  <td>{m.code} - {m.name}</td>
                                  <td>{m.qcPending}</td>
                                  <td className="muted small">{last ? `${last.action} by ${last.by} at ${last.at.split('T')[0]} ${last.at.split('T')[1].slice(0,8)}` : '—'}</td>
                                  <td><button className="btn primary" onClick={()=>handleMaterialAction(m, true)} disabled={!canQC || m.qcPending<=0}>Approve</button></td>
                                  <td><button className="btn warn" onClick={()=>handleMaterialAction(m, false)} disabled={!canQC || m.qcPending<=0}>Reject</button></td>
                                  <td><button className="btn ghost" onClick={()=>setDetail({open:true, type:'material', id:m.code})}>History</button></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="card">
                        <h3>Finished Goods QC</h3>
                        <table>
                          <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>QC Status</th><th>Last Action</th><th>Actions</th></tr></thead>
                          <tbody>
                            {productionLog.map(p => {
                              const last = (p.qcHistory||[])[0]
                              return (
                                <tr key={p.id}>
                                  <td>{p.date}</td>
                                  <td>{p.item}</td>
                                  <td>{p.qty}</td>
                                  <td>{p.qcStatus}</td>
                                  <td className="muted small">{last ? `${last.action} by ${last.by} at ${last.at.split('T')[0]} ${last.at.split('T')[1].slice(0,8)}` : '—'}</td>
                                  <td>
                                    {p.qcStatus==='Pending' && (
                                      <>
                                        <button className="btn" onClick={()=>handleFinishedAction(p, true)} disabled={!canQC}>Approve</button>
                                        <button className="btn warn" style={{marginLeft:8}} onClick={()=>handleFinishedAction(p, false)} disabled={!canQC}>Reject</button>
                                      </>
                                    )}
                                    <button className="btn ghost" style={{marginLeft:8}} onClick={()=>setDetail({open:true, type:'product', id:p.id})}>History</button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {detail.open && (
                        <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000}}>
                          <div style={{background:'#fff', padding:18, borderRadius:8, width:'min(700px,96%)', maxHeight:'80vh', overflowY:'auto'}}>
                            <div style={{display:'flex', alignItems:'center'}}>
                              <h4 style={{margin:0}}>QC History</h4>
                              <div className="right"><button className="btn ghost" onClick={()=>setDetail({open:false, type:null, id:null})}>Close</button></div>
                            </div>
                            <div style={{marginTop:12}}>
                              {detail.type==='material' && (()=>{
                                const m = materials.find(x=>x.code===detail.id)
                                if(!m) return <div className="muted">Material not found</div>
                                return (m.qcHistory && m.qcHistory.length>0) ? (
                                  <table>
                                    <thead><tr><th>Action</th><th>By</th><th>When</th><th>Qty</th></tr></thead>
                                    <tbody>{m.qcHistory.map((h,i)=> <tr key={i}><td>{h.action}</td><td>{h.by}</td><td>{new Date(h.at).toLocaleString()}</td><td>{h.qty||'-'}</td></tr>)}</tbody>
                                  </table>
                                ) : <div className="muted">No QC history for this material.</div>
                              })()}

                              {detail.type==='product' && (()=>{
                                const p = productionLog.find(x=>x.id===detail.id)
                                if(!p) return <div className="muted">Production entry not found</div>
                                return (p.qcHistory && p.qcHistory.length>0) ? (
                                  <table>
                                    <thead><tr><th>Action</th><th>By</th><th>When</th></tr></thead>
                                    <tbody>{p.qcHistory.map((h,i)=> <tr key={i}><td>{h.action}</td><td>{h.by}</td><td>{new Date(h.at).toLocaleString()}</td></tr>)}</tbody>
                                  </table>
                                ) : <div className="muted">No QC history for this production entry.</div>
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
            </tbody>
