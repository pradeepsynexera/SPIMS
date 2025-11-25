import React, { useState, useEffect } from 'react'
import { sampleVendors, sampleSuppliers, sampleMaterials, sampleBOMs, load, save, round } from './data'
import Dashboard from './components/Dashboard'
import Vendors from './components/Vendors'
import Suppliers from './components/Suppliers'
import Materials from './components/Materials'
import Production from './components/Production'
import QC from './components/QC_fix'
import Purchase from './components/Purchase'
import Reports from './components/Reports'
import Login from './components/Login'

export default function App(){
  const sampleUsers = [
    { username: 'admin', password: 'admin', role: 'Admin', name: 'Administrator' },
    { username: 'planner', password: 'planner', role: 'Production Planner', name: 'Planner' },
    { username: 'qc', password: 'qc', role: 'Quality Inspector', name: 'Inspector' },
    { username: 'purchase', password: 'purchase', role: 'Purchase Team', name: 'Purchaser' },
  ]

  const [vendors, setVendors] = useState(()=>load('spims_vendors', sampleVendors))
  const [suppliers, setSuppliers] = useState(()=>load('spims_suppliers', sampleSuppliers))
  const [materials, setMaterials] = useState(()=>load('spims_materials', sampleMaterials))
  const [boms, setBoms] = useState(()=>load('spims_boms', sampleBOMs))
  const [productionLog, setProductionLog] = useState(()=>load('spims_prodlog', []))
  const [plannedProductions, setPlannedProductions] = useState(()=>load('spims_plans', []))
  const [role, setRole] = useState('Admin')
  const [view, setView] = useState('Dashboard')
  const [user, setUser] = useState(null)

  useEffect(()=> save('spims_vendors', vendors), [vendors])
  useEffect(()=> save('spims_suppliers', suppliers), [suppliers])
  useEffect(()=> save('spims_materials', materials), [materials])
  useEffect(()=> save('spims_boms', boms), [boms])
  useEffect(()=> save('spims_prodlog', productionLog), [productionLog])
  useEffect(()=> save('spims_plans', plannedProductions), [plannedProductions])

  // when user changes, update role
  useEffect(()=>{
    if(user && user.role) setRole(user.role)
  }, [user])

  // Toast / confirm system
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({open:false, message:'', resolve: null})
  function notify(message, type='info'){
    const id = Date.now() + Math.random()
    setToasts(t => [...t, {id, message, type}])
    setTimeout(()=> setToasts(t => t.filter(x=>x.id !== id)), 3500)
  }
  function showConfirm(message){
    return new Promise(res => setConfirmState({open:true, message, resolve: res}))
  }
  function handleConfirmResponse(ans){
    if(confirmState.resolve) confirmState.resolve(ans)
    setConfirmState({open:false, message:'', resolve: null})
  }

  const perms = {
    'Admin': { edit:true, qc:true, purchase:true, produce:true },
    'Purchase Team': { edit:false, qc:false, purchase:true, produce:false },
    'Store/Inventory': { edit:true, qc:true, purchase:false, produce:false },
    'Production Planner': { edit:false, qc:false, purchase:false, produce:true },
    'Quality Inspector': { edit:false, qc:true, purchase:false, produce:false },
    'Management Viewer': { edit:false, qc:false, purchase:false, produce:false }
  }

  // QC workflows
  function createGRN(materialCode, qty){
    setMaterials(ms => ms.map(m => m.code === materialCode ? {...m, qcPending: (m.qcPending||0) + qty} : m))
  }
  function inspectMaterial(materialCode, qty, approve=true){
    // legacy handler kept for compatibility; new callers should pass approver via inspectMaterialWithUser
    setMaterials(ms => ms.map(m => {
      if(m.code !== materialCode) return m
      const take = Math.min(qty, m.qcPending||0)
      if(approve) return {...m, qcPending:(m.qcPending||0)-take, stock:(m.stock||0)+take}
      return {...m, qcPending:(m.qcPending||0)-take, rejected:(m.rejected||0)+take}
    }))
  }

  // New: inspect with approver and record history
  function inspectMaterialWithUser(materialCode, qty, approve=true, approver=null){
    setMaterials(ms => ms.map(m => {
      if(m.code !== materialCode) return m
      const take = Math.min(qty, m.qcPending||0)
      const base = approve ? {...m, qcPending:(m.qcPending||0)-take, stock:(m.stock||0)+take} : {...m, qcPending:(m.qcPending||0)-take, rejected:(m.rejected||0)+take}
      const entry = { action: approve ? 'Approved' : 'Rejected', by: approver && approver.name ? approver.name : 'system', at: new Date().toISOString(), qty: take }
      const history = (m.qcHistory || []).slice(); history.unshift(entry)
      return {...base, qcHistory: history}
    }))
  }

  // Finished goods QC stored in productionLog
  function completeProduction(itemCode, qty, producedDetails){
    const entry = { id: Date.now(), item: itemCode, qty, date: new Date().toISOString().slice(0,10), qcStatus: 'Pending', consumed: producedDetails }
    setProductionLog(pl => [entry, ...pl])
  }
  function inspectFinishedGood(prodId, approve=true){
    // legacy: simple status change
    setProductionLog(pl => pl.map(p => p.id === prodId ? {...p, qcStatus: approve ? 'Approved' : 'Rejected'} : p))
  }

  // New: inspect finished good with approver and history
  function inspectFinishedGoodWithUser(prodId, approve=true, approver=null){
    setProductionLog(pl => pl.map(p => {
      if(p.id !== prodId) return p
      const entry = { action: approve ? 'Approved' : 'Rejected', by: approver && approver.name ? approver.name : 'system', at: new Date().toISOString() }
      const history = (p.qcHistory || []).slice(); history.unshift(entry)
      return {...p, qcStatus: approve ? 'Approved' : 'Rejected', qcHistory: history}
    }))
  }

  // Production planning
  function calcRequirements(itemCode, orderQty){
    const bomEntry = boms[itemCode]
    if(!bomEntry) return {}
    const rows = Array.isArray(bomEntry) ? bomEntry : (bomEntry.rows || [])
    const req = {}
    rows.forEach(b => {
      const totalPerUnit = b.qty * (1 + (b.wastage||0)/100)
      const totalNeeded = totalPerUnit * orderQty
      const mat = materials.find(m => m.code === b.material)
      const available = mat ? mat.stock : 0
      const shortage = Math.max(0, totalNeeded - available)
      req[b.material] = { needed: round(totalNeeded), available, shortage: round(shortage), uom: mat?mat.uom:'n/a' }
    })
    return req
  }
  function autoGeneratePR(requirements){
    return Object.entries(requirements).filter(([k,v]) => v.shortage>0).map(([k,v]) => ({material:k, qty:v.shortage, uom:v.uom}))
  }

  function runProduction(itemCode, orderQty){
    const bomEntry = boms[itemCode]
    if(!bomEntry) return {error:'No BOM defined'}
    const rows = Array.isArray(bomEntry) ? bomEntry : (bomEntry.rows || [])
    const consumption = {}
    let ok = true
    rows.forEach(b => {
      const totalPerUnit = b.qty * (1 + (b.wastage||0)/100)
      const totalNeeded = totalPerUnit * orderQty
      const mat = materials.find(m => m.code === b.material)
      const available = mat ? mat.stock : 0
      if(available < totalNeeded) ok = false
      consumption[b.material] = round(totalNeeded)
    })
    if(!ok) return {error:'Insufficient approved stock for production'}
    setMaterials(ms => ms.map(m => ({...m, stock: m.stock - (consumption[m.code]||0)})))
    completeProduction(itemCode, orderQty, consumption)
    return {success:true, consumption}
  }

  // Planned production functions
  function addPlannedProduction(itemCode, dateStr, qty){
    const entry = { id: Date.now(), item: itemCode, plannedQty: Number(qty)||0, producedQty: 0, date: dateStr, status: 'Planned', createdAt: new Date().toISOString() }
    setPlannedProductions(pl=> [entry, ...pl])
    return entry
  }
  function startPlannedProduction(planId){
    setPlannedProductions(pl=> pl.map(p => p.id===planId ? {...p, status:'In Progress', startedAt: new Date().toISOString()} : p))
  }
  function updatePlannedProduction(planId, producedQty){
    setPlannedProductions(pl=> pl.map(p => p.id===planId ? {...p, producedQty: Number(producedQty)||0, status: (Number(producedQty)>0 && Number(producedQty)<p.plannedQty)? 'In Progress' : p.status} : p))
  }
  function completePlannedProduction(planId){
    const plan = plannedProductions.find(p=>p.id===planId)
    if(!plan) return {error:'Plan not found'}
    const qtyToProduce = plan.producedQty && plan.producedQty>0 ? plan.producedQty : plan.plannedQty
    const res = runProduction(plan.item, qtyToProduce)
    if(res.error) return res
    // mark plan completed and attach consumed details
    setPlannedProductions(pl=> pl.map(p => p.id===planId ? {...p, status:'Completed', completedAt: new Date().toISOString(), consumed: res.consumption, producedQty: qtyToProduce} : p))
    return {success:true, consumed: res.consumption}
  }

  return (
    <div className="container">
      {!user ? (
        <Login onLogin={(u)=>{ setUser(u); setRole(u.role) }} users={sampleUsers} />
      ) : (
        <>
          <header style={{background:'#0b5', padding:12, color:'#003'}}>
            <div style={{display:'flex', alignItems:'center'}}>
              <h2 style={{margin:0}}>SPIMS</h2>
              <div className="right" style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="muted small">Signed in as <strong>{user.name}</strong> (<em>{role}</em>)</div>
                <button className="btn ghost" onClick={()=>{ setUser(null); setRole('Management Viewer'); setView('Dashboard') }}>Logout</button>
              </div>
            </div>
          </header>

          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
            <nav>
              {['Dashboard','Vendors','Suppliers','Materials','Production','QC','Purchase','Reports'].map(v => (
                <button key={v} className="tab" onClick={()=>setView(v)} style={{fontWeight:view===v?700:400}}>{v}</button>
              ))}
            </nav>
          </div>

          {view==='Dashboard' && <Dashboard materials={materials} productionLog={productionLog} vendors={vendors} notify={notify} confirm={showConfirm} />}
          {view==='Vendors' && <Vendors vendors={vendors} setVendors={setVendors} canEdit={perms[role].edit} notify={notify} confirm={showConfirm} />}
          {view==='Suppliers' && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} canEdit={perms[role].edit} notify={notify} confirm={showConfirm} />}
          {view==='Materials' && <Materials materials={materials} setMaterials={setMaterials} createGRN={createGRN} inspectMaterial={inspectMaterialWithUser} canQC={perms[role].qc} notify={notify} confirm={showConfirm} user={user} />}
          {view==='Production' && <Production boms={boms} materials={materials} calcRequirements={calcRequirements} autoGeneratePR={autoGeneratePR} runProduction={runProduction} setBoms={setBoms} canProduce={perms[role].produce} productionLog={productionLog} plannedProductions={plannedProductions} addPlannedProduction={addPlannedProduction} startPlannedProduction={startPlannedProduction} updatePlannedProduction={updatePlannedProduction} completePlannedProduction={completePlannedProduction} notify={notify} confirm={showConfirm} />}
          {view==='QC' && <QC materials={materials} inspectMaterial={inspectMaterialWithUser} productionLog={productionLog} inspectFinishedGood={inspectFinishedGoodWithUser} canQC={perms[role].qc} notify={notify} confirm={showConfirm} user={user} />}
          {view==='Purchase' && <Purchase materials={materials} autoGeneratePR={autoGeneratePR} calcRequirements={calcRequirements} notify={notify} confirm={showConfirm} />}
          {view==='Reports' && <Reports materials={materials} productionLog={productionLog} vendors={vendors} notify={notify} confirm={showConfirm} />}

          <div style={{marginTop:18}} className="muted small">Tip: data is stored in browser localStorage. To reset clear site data.</div>
          {/* Toasts */}
          <div style={{position:'fixed', right:18, top:18, zIndex:9999, display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
            {toasts.map(t=> (
              <div key={t.id} style={{background:'#fff', padding:10, borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.12)', marginTop:8, minWidth:200, borderLeft: `4px solid ${t.type==='warn'?'#f59e0b': t.type==='danger'?'#ef4444':'#06a'}`}}>{t.message}</div>
            ))}
          </div>
          {/* Confirm modal */}
          {confirmState.open && (
            <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000}}>
              <div style={{background:'#fff', padding:18, borderRadius:8, width:420}}>
                <div style={{marginBottom:12}}>{confirmState.message}</div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
                  <button className="btn ghost" onClick={()=>handleConfirmResponse(false)}>No</button>
                  <button className="btn primary" onClick={()=>handleConfirmResponse(true)}>Yes</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
