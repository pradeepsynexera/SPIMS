import React, { useState } from 'react'

export default function Materials({materials, setMaterials, createGRN, inspectMaterial, canQC, notify, confirm, user}){
  const [grn, setGrn] = useState({code:'',qty:0})
  const [editingMaterial, setEditingMaterial] = useState(null)
  const materialTypeUOMs = {
    'PET/HDPE Resin': ['kg','mt'],
    'Additives/Masterbatch': ['kg','%'],
    'Preforms': ['pcs','g'],
    'Caps': ['pcs'],
    'Labels/Films': ['kg','micron','m'],
    'Cartons': ['pcs','bundle','pack'],
    'Chemicals': ['ltr','kg']
  }
  const materialTypes = Object.keys(materialTypeUOMs)
  const uomOptions = ['pcs','kg','g','ltr','ml','m','m2','pack','box','set']
  function addGRN(){ if(!grn.code || grn.qty<=0){ notify && notify('Select material and enter qty','warn'); return } createGRN(grn.code, Number(grn.qty)); setGrn({code:'',qty:0}); notify && notify('GRN created (QC Pending)','success') }
  return (
    <div>
      <div className="card">
        <div style={{display:'flex', alignItems:'center'}}>
          <h3 style={{margin:0}}>Material Master & Stock</h3>
          <div className="right">
            <button className="btn primary" onClick={()=> setEditingMaterial({ id:'', originalId: null, name:'', category:'', uom:'pcs', reorder:0, stock:0, qcPending:0, rejected:0, isNew:true })}>Add Material</button>
          </div>
        </div>
        <div style={{marginTop:12}} className="grid">
          {materials.map(m=> (
            <div key={m.code} className="card" style={{padding:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontWeight:700}}>{m.name}</div>
                <div className="muted">({m.code})</div>
                <div className="right" style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn ghost" onClick={()=> setEditingMaterial({ id:m.code, originalId:m.code, name:m.name, category:m.category, uom:m.uom, reorder:m.reorder, stock:m.stock, qcPending:m.qcPending, rejected:m.rejected, isNew:false })}>Edit</button>
                  <span className={m.stock < m.reorder ? 'badge warn' : 'badge ok'}>{m.stock} {m.uom}</span>
                </div>
              </div>
              <div className="muted small" style={{marginTop:8}}>{m.category}</div>
              <div style={{marginTop:10}}>
                <div className="muted small">Reorder level: {m.reorder}</div>
                <div style={{marginTop:6}} className="progress"><i style={{width: Math.min(100, Math.round((m.stock / Math.max(1,m.reorder)) * 100)) + '%'}}></i></div>
                <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
                  <div className="muted">QC Pending: <strong>{m.qcPending}</strong></div>
                  <div className="muted">Rejected: <strong>{m.rejected}</strong></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{position:'relative'}}>
        <h4>Simulate GRN (adds to QC Pending)</h4>
        <div className="row">
          <select value={grn.code} onChange={e=>setGrn({...grn,code:e.target.value})}>
            <option value="">Select material</option>
            {materials.map(m=> <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
          </select>
          <input type="number" value={grn.qty} onChange={e=>setGrn({...grn,qty:e.target.value})} />
          <button className="btn primary" onClick={addGRN}>Create GRN</button>
        </div>
      </div>

      <div className="card">
        <h4>QC Inspection</h4>
        <table className="table-compact">
          <thead><tr><th>Material</th><th>QC Pending</th><th>Approve</th><th>Reject</th></tr></thead>
          <tbody>{materials.map(m=> (
            <tr key={m.code}>
              <td>{m.code} - {m.name}</td>
              <td>{m.qcPending}</td>
              <td>
                <button className="btn primary" disabled={!canQC || m.qcPending<=0} onClick={async ()=>{
                  if(!canQC || m.qcPending<=0) return
                  const ok = confirm ? await confirm(`Approve ${m.qcPending} ${m.uom} for ${m.code}?`) : window.confirm(`Approve ${m.qcPending} ${m.uom} for ${m.code}?`)
                  if(!ok) return
                  inspectMaterial(m.code, m.qcPending, true, user)
                  notify && notify('Material approved','success')
                }}>Approve</button>
              </td>
              <td>
                <button className="btn warn" disabled={!canQC || m.qcPending<=0} onClick={async ()=>{
                  if(!canQC || m.qcPending<=0) return
                  const ok = confirm ? await confirm(`Reject ${m.qcPending} ${m.uom} for ${m.code}?`) : window.confirm(`Reject ${m.qcPending} ${m.uom} for ${m.code}?`)
                  if(!ok) return
                  inspectMaterial(m.code, m.qcPending, false, user)
                  notify && notify('Material rejected','warn')
                }}>Reject</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {editingMaterial && (
        <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
          <div style={{background:'#fff', padding:18, borderRadius:8, width:'min(800px,96%)', maxHeight:'90vh', overflowY:'auto'}}>
            <div style={{display:'flex', alignItems:'center'}}>
              <h4 style={{margin:0}}>{editingMaterial.isNew ? 'Add Material' : `Edit Material: ${editingMaterial.originalId || editingMaterial.id}`}</h4>
              <div className="right"><button className="btn ghost" onClick={()=>setEditingMaterial(null)}>Close</button></div>
            </div>
            <div style={{marginTop:8}} className="muted small">Provide a unique RM ID (code) and other details. Renaming an existing RM ID will replace previous entry after confirmation.</div>
            <div style={{marginTop:12}}>
              <div className="row" style={{gap:8,flexWrap:'wrap'}}>
                <div style={{minWidth:220}}>
                  <label className="muted small">RM ID (code)</label>
                  <input style={{width:'100%'}} value={editingMaterial.id} onChange={e=>setEditingMaterial({...editingMaterial, id: e.target.value.trim()})} placeholder="e.g. RM-001" />
                </div>
                <div style={{minWidth:260}}>
                  <label className="muted small">Name</label>
                  <input style={{width:'100%'}} value={editingMaterial.name} onChange={e=>setEditingMaterial({...editingMaterial, name: e.target.value})} placeholder="Material name" />
                </div>
                <div style={{minWidth:200}}>
                  <label className="muted small">Material Type</label>
                  <select style={{width:'100%'}} value={editingMaterial.category} onChange={e=>{
                    const cat = e.target.value
                    const list = materialTypeUOMs[cat] || uomOptions
                    const newUom = list.includes(editingMaterial.uom) ? editingMaterial.uom : list[0]
                    setEditingMaterial({...editingMaterial, category: cat, uom: newUom})
                  }}>
                    <option value="">Select type</option>
                    {materialTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="row" style={{gap:8, marginTop:10, alignItems:'center'}}>
                <div style={{minWidth:160}}>
                  <label className="muted small">UOM</label>
                  {(() => {
                    const list = materialTypeUOMs[editingMaterial.category] || uomOptions
                    return (
                      <select style={{width:'100%'}} value={editingMaterial.uom} onChange={e=>setEditingMaterial({...editingMaterial, uom: e.target.value})}>
                        {list.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    )
                  })()}
                </div>
                <div style={{minWidth:140}}>
                  <label className="muted small">Reorder Level</label>
                  <input style={{width:'100%'}} type="number" min="0" value={editingMaterial.reorder} onChange={e=>setEditingMaterial({...editingMaterial, reorder: Number(e.target.value)})} />
                </div>
                <div style={{minWidth:140}}>
                  <label className="muted small">Stock</label>
                  <input style={{width:'100%'}} type="number" min="0" value={editingMaterial.stock} onChange={e=>setEditingMaterial({...editingMaterial, stock: Number(e.target.value)})} />
                </div>
                <div style={{minWidth:140}}>
                  <label className="muted small">QC Pending</label>
                  <input style={{width:'100%'}} type="number" min="0" value={editingMaterial.qcPending} onChange={e=>setEditingMaterial({...editingMaterial, qcPending: Number(e.target.value)})} />
                </div>
                <div style={{minWidth:140}}>
                  <label className="muted small">Rejected</label>
                  <input style={{width:'100%'}} type="number" min="0" value={editingMaterial.rejected} onChange={e=>setEditingMaterial({...editingMaterial, rejected: Number(e.target.value)})} />
                </div>
              </div>

                <div style={{marginTop:12, display:'flex', alignItems:'center'}}>
                <div style={{flex:1}} />
                <button className="btn primary" onClick={async ()=>{
                  // validate
                  if(!editingMaterial.id){ notify && notify('Enter RM ID','warn'); return }
                  if(!editingMaterial.name){ notify && notify('Enter name','warn'); return }
                  const exists = materials.find(m => m.code === editingMaterial.id)
                  const isRename = editingMaterial.originalId && editingMaterial.originalId !== editingMaterial.id
                  if(exists && (!editingMaterial.originalId || editingMaterial.originalId !== editingMaterial.id)){
                    const ok = confirm ? await confirm('A material with this RM ID already exists. Overwrite?') : window.confirm('A material with this RM ID already exists. Overwrite?')
                    if(!ok) return
                  }
                  // build material object
                  const mat = { code: editingMaterial.id, name: editingMaterial.name, category: editingMaterial.category, uom: editingMaterial.uom || 'pcs', reorder: Number(editingMaterial.reorder)||0, stock: Number(editingMaterial.stock)||0, qcPending: Number(editingMaterial.qcPending)||0, rejected: Number(editingMaterial.rejected)||0 }
                  // save: remove old if renaming
                  setMaterials(prev => {
                    let others = prev.filter(m => m.code !== (editingMaterial.originalId || '') && m.code !== editingMaterial.id)
                    // if not renaming and original exists, preserve others but replace
                    if(editingMaterial.originalId && editingMaterial.originalId === editingMaterial.id){
                      notify && notify('Material updated','success')
                      return prev.map(m => m.code === editingMaterial.id ? mat : m)
                    }
                    // insert new at front
                    notify && notify('Material saved','success')
                    return [mat, ...others]
                  })
                  setEditingMaterial(null)
                }}>Save</button>
                <button className="btn ghost" onClick={()=>setEditingMaterial(null)} style={{marginLeft:8}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
