import React, { useState, useMemo } from 'react'

export default function Production({boms, materials, calcRequirements, autoGeneratePR, runProduction, setBoms, canProduce, productionLog, plannedProductions, addPlannedProduction, startPlannedProduction, updatePlannedProduction, completePlannedProduction, notify, confirm}){
  const [item, setItem] = useState(Object.keys(boms)[0]||'')
  const [qty, setQty] = useState(10)
  const [req, setReq] = useState({})
  const [prLines, setPrLines] = useState([])
  const [editingBOM, setEditingBOM] = useState(null)
  const [planForm, setPlanForm] = useState({item: Object.keys(boms)[0]||'', date: new Date().toISOString().slice(0,10), qty:10})
  const [detailModal, setDetailModal] = useState({open:false, planId:null})

  // compute whether there are shortages
  const shortagesExist = useMemo(()=> Object.values(req).some(r => r.shortage > 0), [req])

  function check(){
    if(!item){ notify && notify('Select an item/BOM first','warn'); return }
    const computed = calcRequirements(item, Number(qty)||0)
    setReq(computed)
    setPrLines(autoGeneratePR(computed))
  }

  function matLabel(code){
    const m = materials.find(x => x.code === code)
    return m ? `${code} - ${m.name}` : code
  }

  function bomLabel(code){
    const entry = boms[code]
    const name = entry && entry.name
    return name ? `${code} - ${name}` : code
  }

  async function produce(){
    if(!canProduce){ notify && notify('You do not have permission to produce','warn'); return }
    if(shortagesExist){ notify && notify('Cannot produce while shortages exist. Create PR or reduce order qty.','warn'); return }
    const ok = confirm ? await confirm(`Run production for ${item} — Qty ${qty}? This will consume approved stock.`) : window.confirm(`Run production for ${item} — Qty ${qty}? This will consume approved stock.`)
    if(!ok) return
    const res = runProduction(item, Number(qty)||0)
    if(res.error) notify && notify(res.error,'danger'); else notify && notify('Production created and moved to QC Pending','success')
    // clear requirements after run
    setReq({}); setPrLines([])
  }

  function addPlan(){
    if(!planForm.item){ notify && notify('Select item','warn'); return }
    if(!planForm.date){ notify && notify('Select date','warn'); return }
    if(!planForm.qty || planForm.qty<=0){ notify && notify('Enter qty','warn'); return }
    addPlannedProduction(planForm.item, planForm.date, planForm.qty)
    notify && notify('Plan added','success')
    setPlanForm({...planForm, qty:10})
  }

  function startPlan(id){
    startPlannedProduction(id)
  }

  function setPlanProduced(id, v){
    updatePlannedProduction(id, v)
  }

  async function completePlan(id){
    const ok = confirm ? await confirm('Complete this plan and consume raw materials now?') : window.confirm('Complete this plan and consume raw materials now?')
    if(!ok) return
    const res = completePlannedProduction(id)
  if(res.error) notify && notify(res.error,'danger'); else { notify && notify('Plan completed; production moved to QC Pending','success'); setDetailModal({open:true, planId: id}) }
  }

  function openDetail(planId){ setDetailModal({open:true, planId}) }
  function closeDetail(){ setDetailModal({open:false, planId:null}) }

  function createPR(){
    if(prLines.length===0){ notify && notify('No PR lines to create','warn'); return }
    // For demo: copy PR to clipboard and show summarized view
    const text = prLines.map(l=> `${l.material}: ${l.qty} ${l.uom}`).join('\n')
    try{ navigator.clipboard && navigator.clipboard.writeText(text); notify && notify('PR copied to clipboard (demo).','success') }catch(e){ notify && notify('PR ready:\n' + text,'info') }
  }

  function startEditBOM(bomId){
    const entry = boms[bomId] || []
    const rows = Array.isArray(entry) ? entry.map(r=>({material:r.material, qty:r.qty, wastage:r.wastage||0})) : (entry.rows || [])
    const mould = Array.isArray(entry) ? (entry._mould || '') : (entry.mould || '')
    const piecesPerBox = Array.isArray(entry) ? (entry._piecesPerBox || 0) : (entry.piecesPerBox || 0)
    const piecesPerPolybag = Array.isArray(entry) ? (entry._piecesPerPolybag || 0) : (entry.piecesPerPolybag || 0)
    const name = Array.isArray(entry) ? (entry._name || '') : (entry.name || '')
    setEditingBOM({ id: bomId, originalId: bomId, isNew:false, rows, mould, piecesPerBox, piecesPerPolybag })
  }

  function saveEditedBOM(){
    if(!editingBOM || !editingBOM.id) return
    const rows = (editingBOM.rows || []).map(r=> ({ material: r.material, qty: Number(r.qty)||0, wastage: Number(r.wastage)||0 }))
    setBoms(prev => ({...prev, [editingBOM.id]: { rows, name: editingBOM.name || '', mould: editingBOM.mould || '', piecesPerBox: Number(editingBOM.piecesPerBox)||0, piecesPerPolybag: Number(editingBOM.piecesPerPolybag)||0 } }))
    setEditingBOM(null)
  }

  return (
    <div>
      <div className="card">
        <h3>Production Planning</h3>
        <div className="row" style={{gap:10}}>
          <select value={item} onChange={e=>setItem(e.target.value)}>
            <option value="">-- Select Item / BOM --</option>
            {Object.keys(boms).map(k=> <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="number" min={1} value={qty} onChange={e=>setQty(e.target.value)} style={{width:120}} />
          <button className="btn primary" onClick={check}>Check Requirements</button>
          <button className="btn ghost" onClick={()=>{ setReq({}); setPrLines([]) }}>Clear</button>
          <div className="right">
            <button className="btn primary" onClick={produce} disabled={!canProduce || Object.keys(req).length===0}>Run Production</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <h4>Requirements</h4>
          {Object.keys(req).length===0 ? <div className="muted">No requirements calculated. Click "Check Requirements".</div> : (
            <table>
              <thead><tr><th>Material</th><th>Needed</th><th>Available</th><th>Shortage</th><th>Action</th></tr></thead>
              <tbody>
                {Object.entries(req).map(([mat,v])=> (
                      <tr key={mat}>
                        <td>{matLabel(mat)}</td>
                    <td>{v.needed} {v.uom}</td>
                    <td>{v.available}</td>
                    <td className={v.shortage>0? 'danger':''}>{v.shortage}</td>
                    <td>{v.shortage>0 ? <button className="btn ghost" onClick={()=>{ setPrLines(prev => { const found = prev.find(p=>p.material===mat); if(found) return prev; return [...prev, {material:mat, qty:v.shortage, uom:v.uom}] }) }}>Add to PR</button> : <span className="badge ok">Sufficient</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{marginTop:12}}>
          <h4>Purchase Requirement (PR)</h4>
          {prLines.length===0 ? <div className="muted">No PR lines. Add shortage lines above or click auto-generate.</div> : (
            <table className="table-compact">
              <thead><tr><th>Material</th><th>Qty</th><th>UOM</th><th></th></tr></thead>
              <tbody>{prLines.map((l,i)=> <tr key={i}><td>{matLabel(l.material)}</td><td>{l.qty}</td><td>{l.uom}</td><td><button className="btn ghost" onClick={()=> setPrLines(pl=>pl.filter((_,idx)=>idx!==i))}>Remove</button></td></tr>)}</tbody>
            </table>
          )}
          <div className="form-actions" style={{marginTop:8}}>
            <button className="btn primary" onClick={createPR} disabled={prLines.length===0}>Create PR (demo)</button>
            <button className="btn ghost" onClick={()=> setPrLines(autoGeneratePR(req))}>Auto-generate PR</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Daily Production / Schedule</h4>
        <div className="row" style={{gap:8,alignItems:'center'}}>
          <select value={planForm.item} onChange={e=>setPlanForm({...planForm, item: e.target.value})}>
            <option value="">-- Select Item / BOM --</option>
            {Object.keys(boms).map(k=> <option key={k} value={k}>{bomLabel(k)}</option>)}
          </select>
          <input type="date" value={planForm.date} onChange={e=>setPlanForm({...planForm, date: e.target.value})} />
          <input type="number" min={1} value={planForm.qty} onChange={e=>setPlanForm({...planForm, qty: Number(e.target.value)})} style={{width:120}} />
          <button className="btn primary" onClick={addPlan}>Add Plan</button>
        </div>

        <div style={{marginTop:12}}>
          <h5>Planned Productions</h5>
          {(!plannedProductions || plannedProductions.length===0) ? <div className="muted">No planned productions.</div> : (
            <table>
              <thead><tr><th>Date</th><th>Item</th><th>Planned</th><th>Produced</th><th>Progress</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {plannedProductions.map(p=> (
                  <React.Fragment key={p.id}>
                    <tr>
              <td>{p.date}</td>
                <td>{bomLabel(p.item)}</td>
                      <td>{p.plannedQty}</td>
                      <td><input type="number" min={0} value={p.producedQty||0} onChange={e=>setPlanProduced(p.id, Number(e.target.value))} style={{width:90}} /></td>
                      <td>
                        <div style={{width:140}}>
                          <div className="progress"><i style={{width: Math.min(100, Math.round(((p.producedQty||0)/Math.max(1,p.plannedQty))*100)) + '%'}}></i></div>
                        </div>
                      </td>
                      <td>{p.status}</td>
                      <td>
                        <button className="btn" onClick={()=>openDetail(p.id)}>Details</button>
                        {p.status==='Planned' && <button className="btn" onClick={()=>startPlan(p.id)} style={{marginLeft:8}}>Start</button>}
                        {p.status!=='Completed' && <button className="btn primary" style={{marginLeft:8}} onClick={()=>completePlan(p.id)}>Complete</button>}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

          {detailModal.open && (
            <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000}}>
              <div style={{background:'#fff', padding:18, borderRadius:8, width:'min(700px,96%)', maxHeight:'80vh', overflowY:'auto'}}>
                <div style={{display:'flex', alignItems:'center'}}>
                  <h4 style={{margin:0}}>Plan Details</h4>
                  <div className="right"><button className="btn ghost" onClick={closeDetail}>Close</button></div>
                </div>
                <div style={{marginTop:12}}>
                  {(() => {
                        const plan = plannedProductions.find(x=>x.id===detailModal.planId)
                    if(!plan) return <div className="muted">Plan not found.</div>
                    return (
                      <div>
                        <div><strong>Item:</strong> {plan.item} &nbsp; <strong>Date:</strong> {plan.date} &nbsp; <strong>Status:</strong> {plan.status}</div>
                        <div style={{marginTop:8}}>
                          <h5>Consumed Materials</h5>
                          {plan.consumed ? (
                            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                              {Object.entries(plan.consumed).map(([m,v])=> (
                                <div key={m} style={{minWidth:140}}>{matLabel(m)}: <strong>{v}</strong></div>
                              ))}
                            </div>
                          ) : (
                            <div className="muted">No consumption recorded yet. Complete the plan to consume materials.</div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

      <div className="card">
        <h4>Manage BOMs</h4>
        <div className="muted small" style={{marginBottom:8}}>Edit existing BOMs inline. Save to update BOM definitions used in planning.</div>
        {Object.keys(boms).length===0 && <div className="muted">No BOMs defined.</div>}
        <div className="grid">
          {Object.entries(boms).map(([k,entry])=> {
            const rows = Array.isArray(entry) ? entry : (entry.rows||[])
            const mould = Array.isArray(entry) ? (entry._mould||'') : (entry.mould||'')
            const piecesPerBox = Array.isArray(entry) ? (entry._piecesPerBox||0) : (entry.piecesPerBox||0)
            const piecesPerPolybag = Array.isArray(entry) ? (entry._piecesPerPolybag||0) : (entry.piecesPerPolybag||0)
            const name = Array.isArray(entry) ? (entry._name||'') : (entry.name||'')
            return (
            <div key={k} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{k}</div>
                <div className="muted small" style={{marginLeft:8}}>{rows.length} materials{ name ? ` • ${name}` : '' }{mould? ` • Mould: ${mould}`: ''}{piecesPerBox? ` • Box: ${piecesPerBox}`: ''}{piecesPerPolybag? ` • Polybag: ${piecesPerPolybag}`: ''}</div>
                <div className="right">
                  <button className="btn ghost" onClick={()=>startEditBOM(k)}>Edit</button>
                  <button className="btn" style={{marginLeft:8}} onClick={()=>{ setEditingBOM({ id:k, isNew:false, rows: rows.map(r=>({material:r.material, qty:r.qty, wastage:r.wastage||0})), mould, piecesPerBox, piecesPerPolybag }) }}>Quick Edit</button>
                </div>
              </div>
              <div style={{marginTop:8}}>
                <table className="table-compact">
                  <thead><tr><th>Material</th><th>Qty</th><th>Wastage</th></tr></thead>
                  <tbody>{rows.map((e,i)=> <tr key={i}><td>{matLabel(e.material)}</td><td>{e.qty}</td><td>{e.wastage||0}%</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            )
          })}
          {/* new BOM card */}
          <div className="card" style={{padding:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontWeight:700}}>+ New BOM</div>
              <div className="muted small" style={{marginLeft:8}}>Create a new BOM</div>
            </div>
            <div style={{marginTop:8}}>
              <button className="btn primary" onClick={()=> setEditingBOM({ id:'', isNew:true, rows: [{material:'', qty:0, wastage:0}], mould:'', piecesPerBox:0, piecesPerPolybag:0 })}>Create BOM</button>
            </div>
          </div>
        </div>

        {editingBOM && (
          <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
            <div style={{background:'#fff', padding:18, borderRadius:8, width:'min(900px,95%)', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 6px 24px rgba(0,0,0,0.2)'}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <h5 style={{margin:0}}>{editingBOM.isNew ? 'Create BOM' : `Edit BOM`}</h5>
                <div className="muted small">(Define BOM ID and add materials)</div>
                <div className="right"><button className="btn ghost" onClick={()=>setEditingBOM(null)}>Close</button></div>
              </div>

              <div style={{marginTop:10}}>
                <label className="muted small">BOM ID</label>
                <input placeholder="Enter BOM id (e.g. FG-001)" value={editingBOM.id} onChange={e=> setEditingBOM({...editingBOM, id: e.target.value.trim()})} style={{width:260, marginLeft:8}} />
              </div>

              <div style={{marginTop:8}}>
                <label className="muted small">BOM Name (optional)</label>
                <input placeholder="Enter BOM name (e.g. Finished Good Name)" value={editingBOM.name||''} onChange={e=> setEditingBOM({...editingBOM, name: e.target.value})} style={{width:320, marginLeft:8}} />
              </div>

              <div style={{marginTop:8}}>
                <label className="muted small">Mould (optional)</label>
                <input placeholder="Enter mould id or name" value={editingBOM.mould||''} onChange={e=> setEditingBOM({...editingBOM, mould: e.target.value})} style={{width:260, marginLeft:8}} />
              </div>

              <div style={{marginTop:8, display:'flex', gap:12}}>
                <div>
                  <label className="muted small">Pieces per Box</label>
                  <input type="number" min="0" value={editingBOM.piecesPerBox||0} onChange={e=> setEditingBOM({...editingBOM, piecesPerBox: Number(e.target.value)})} style={{width:160, marginLeft:8}} />
                </div>
                <div>
                  <label className="muted small">Pieces per Polybag</label>
                  <input type="number" min="0" value={editingBOM.piecesPerPolybag||0} onChange={e=> setEditingBOM({...editingBOM, piecesPerPolybag: Number(e.target.value)})} style={{width:160, marginLeft:8}} />
                </div>
              </div>

              <div className="muted small" style={{marginTop:8}}>Use the table to add materials for this BOM. Quantity is per unit produced. Wastage is percentage.</div>
              <div style={{marginTop:8, overflowX:'auto'}}>
                <table className="table-compact" style={{width:'100%'}}>
                  <thead><tr><th style={{width:180}}>Material Code</th><th style={{width:140}}>Qty / Unit</th><th style={{width:120}}>Wastage %</th><th style={{width:80}}>Actions</th></tr></thead>
                  <tbody>
                    {editingBOM.rows.map((r, idx)=> (
                      <tr key={idx}>
                        <td>
                          <select value={r.material} onChange={e=>{
                            const rows = editingBOM.rows.slice(); rows[idx].material = e.target.value; setEditingBOM({...editingBOM, rows})
                          }}>
                            <option value="">Select material</option>
                            {materials.map(mm => <option key={mm.code} value={mm.code}>{mm.code} - {mm.name}</option>)}
                          </select>
                        </td>
                        <td><input type="number" min="0" step="0.01" value={r.qty} onChange={e=>{ const rows = editingBOM.rows.slice(); rows[idx].qty = Number(e.target.value); setEditingBOM({...editingBOM, rows}) }} /></td>
                        <td><input type="number" min="0" step="0.1" value={r.wastage} onChange={e=>{ const rows = editingBOM.rows.slice(); rows[idx].wastage = Number(e.target.value); setEditingBOM({...editingBOM, rows}) }} /></td>
                        <td><button className="btn ghost" onClick={()=>{ const rows = editingBOM.rows.slice(); rows.splice(idx,1); setEditingBOM({...editingBOM, rows}) }}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{marginTop:10, display:'flex', alignItems:'center'}}>
                <button className="btn" onClick={()=>{ setEditingBOM({...editingBOM, rows: [...editingBOM.rows, {material:'', qty:0, wastage:0}]}) }}>Add Row</button>
                <div style={{flex:1}} />
                <button className="btn primary" onClick={()=>{ // validate and save
                  if(!editingBOM.id){ notify && notify('Enter BOM id','warn'); return }
                  const rows = (editingBOM.rows||[]).filter(r=>r.material && r.qty>0)
                  if(rows.length===0){ notify && notify('Add at least one material with qty>0','warn'); return }
                  // save with rename support
                  setBoms(prev => {
                    const copy = {...prev}
                    if(editingBOM.originalId && editingBOM.originalId !== editingBOM.id){ delete copy[editingBOM.originalId] }
                    copy[editingBOM.id] = { rows: rows.map(r=> ({material:r.material, qty: r.qty, wastage: r.wastage})), name: editingBOM.name || '', mould: editingBOM.mould || '', piecesPerBox: Number(editingBOM.piecesPerBox)||0, piecesPerPolybag: Number(editingBOM.piecesPerPolybag)||0 }
                    return copy
                  })
                  notify && notify('BOM saved','success')
                  setEditingBOM(null)
                }} style={{marginLeft:8}}>Save BOM</button>
                <button className="btn ghost" onClick={()=>setEditingBOM(null)} style={{marginLeft:8}}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h4>Recent Production (pending QC shown)</h4>
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>QC Status</th><th>Consumed</th></tr></thead>
          <tbody>{productionLog.map(p=> (
            <tr key={p.id}><td>{p.date}</td><td>{bomLabel(p.item)}</td><td>{p.qty}</td><td>{p.qcStatus}</td><td>
              <div style={{whiteSpace:'pre-wrap',margin:0}}>
                {Object.entries(p.consumed).map(([m,v])=> `${matLabel(m)}: ${v}`).join('\n')}
              </div>
            </td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
