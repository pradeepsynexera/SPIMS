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
  const [boms, setBoms] = useState(()=>{
    const raw = load('spims_boms', sampleBOMs)
    const normalized = {}
    Object.entries(raw || {}).forEach(([k,v]) => {
      if(Array.isArray(v)){
        normalized[k] = { rows: v.map(r=> ({ material: r.material, qty: r.qty, wastage: r.wastage||0 })), name: '', mould: '', piecesPerBox: 0, piecesPerPolybag: 0 }
      } else {
        normalized[k] = v
      }
    })
    return normalized
  })
  const [productionLog, setProductionLog] = useState(()=>load('spims_prodlog', []))
  const [plannedProductions, setPlannedProductions] = useState(()=>load('spims_plans', []))
  const [role, setRole] = useState('Admin')
  const [view, setView] = useState('Dashboard')
  const [user, setUser] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(()=> {
    try{ return JSON.parse(localStorage.getItem('spims_sidebar_collapsed')||'false') }catch(e){ return false }
  })
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

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

  // On mount, detect and report BOM migration (if any legacy array-form BOMs were found and normalized)
  useEffect(()=>{
    const raw = load('spims_boms', sampleBOMs)
    const legacyCount = Object.values(raw||{}).filter(v=> Array.isArray(v)).length
    if(legacyCount>0){
      notify && notify(`Migrated ${legacyCount} BOM(s) to the new format on app load.`, 'info')
    }
  }, [])
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

  // derive which top-level views should be visible for the current role
  function visibleViewsForRole(r){
    const p = perms[r] || {}
    const views = ['Dashboard']
    if(p.edit) views.push('Vendors','Suppliers','Materials')
    if(p.produce) views.push('Production')
    if(p.qc) views.push('QC')
    if(p.purchase) views.push('Purchase')
    // Reports should be visible to everyone who can view the app
    views.push('Reports')
    return views
  }

  useEffect(()=>{
    // if current view is not allowed for the role, reset to Dashboard
    const allowed = visibleViewsForRole(role)
    if(!allowed.includes(view)) setView('Dashboard')
  }, [role])

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
  // Distribute a plan into daily plans using a minimum per-day target.
  // Example: plan for 1000 with minPerDay=100 -> days = ceil(1000/100)=10 -> create 10 daily plans with quantities close to even split.
  function schedulePlanDaily(planId, minPerDay){
    const plan = plannedProductions.find(p=>p.id===planId)
    if(!plan) return {error:'Plan not found'}
    const total = Number(plan.plannedQty) || 0
    const minPer = Number(minPerDay) || 0
    if(minPer <= 0) return {error:'minPerDay must be > 0'}
    const days = Math.max(1, Math.ceil(total / minPer))
    const base = Math.floor(total / days)
    const remainder = total - base * days
    const dayQuantities = Array.from({length: days}, (_,i) => base + (i < remainder ? 1 : 0))
    // starting from plan.date (ISO YYYY-MM-DD) or today if invalid
    const start = plan.date ? new Date(plan.date) : new Date()
    const created = new Date().toISOString()
    const newEntries = dayQuantities.map((q, idx) => ({ id: Date.now() + idx + Math.floor(Math.random()*1000), item: plan.item, plannedQty: q, producedQty: 0, date: new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx).toISOString().slice(0,10), status: 'Planned', createdAt: created, parentPlanId: plan.id }))
    // mark original plan as Distributed and keep for audit
    setPlannedProductions(pl => {
      const others = pl.filter(p=>p.id !== planId)
      return [...newEntries, ...others.map(p=> p.id===planId ? {...p, status:'Distributed', distributedTo: newEntries.map(e=>e.id)} : p)]
    })
    return {success:true, created: newEntries.length}
  }
  // More flexible scheduler: supports fixedDays, skipWeekends, startDate, or explicit preview array
  function schedulePlanWithOptions(planId, opts){
    const plan = plannedProductions.find(p=>p.id===planId)
    if(!plan) return {error:'Plan not found'}
    const total = Number(plan.plannedQty) || 0
    const minPer = Number(opts && opts.minPerDay) || 0
    const fixedDays = opts && Number(opts.fixedDays) > 0 ? Number(opts.fixedDays) : null
    const skipWeekends = !!(opts && opts.skipWeekends)
    const start = opts && opts.startDate ? new Date(opts.startDate) : new Date(plan.date || Date.now())
    const preview = opts && Array.isArray(opts.preview) && opts.preview.length>0 ? opts.preview : null

    // If preview provided, use preview quantities with computed dates (respecting skipWeekends)
    let dayEntries = []
    if(preview){
      // use preview dates/qty directly
      dayEntries = preview.map((r, idx) => ({date: r.date, qty: Number(r.qty)||0}))
    } else {
      let days = 1
      if(fixedDays) days = fixedDays
      else if(minPer>0) days = Math.max(1, Math.ceil(total / minPer))
      else days = 1
      // distribute total into 'days' parts
      const base = Math.floor(total / days)
      const remainder = total - base * days
      const parts = Array.from({length: days}, (_,i) => base + (i < remainder ? 1 : 0))
      // generate dates sequence respecting skipWeekends
      const seq = []
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      for(let i=0; seq.length<parts.length;){
        // if skipWeekends and day is saturday(6) or sunday(0), advance
        const dow = d.getDay()
        if(skipWeekends && (dow===0 || dow===6)){
          d.setDate(d.getDate()+1); continue
        }
        seq.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10))
        d.setDate(d.getDate()+1)
      }
      dayEntries = parts.map((q,idx)=> ({date: seq[idx], qty: q}))
    }

    const created = new Date().toISOString()
    const newEntries = dayEntries.map((e, idx) => ({ id: Date.now() + idx + Math.floor(Math.random()*1000), item: plan.item, plannedQty: Number(e.qty)||0, producedQty: 0, date: e.date, status: 'Planned', createdAt: created, parentPlanId: plan.id }))
    setPlannedProductions(pl => {
      const others = pl.filter(p=>p.id !== planId)
      return [...newEntries, ...others.map(p=> p.id===planId ? {...p, status:'Distributed', distributedTo: newEntries.map(e=>e.id)} : p)]
    })
    return {success:true, created: newEntries.length}
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
          <header className="app-header">
            <div className="header-left">
              <button className="sidebar-toggle-mobile" onClick={()=> setSidebarMobileOpen(s=>!s)} aria-label="Toggle menu" aria-expanded={sidebarMobileOpen}>☰</button>
              <h2 className="brand">SPIMS</h2>
            </div>
            <div className="flex-spacer" />
            <div className="header-right">
              <div className="muted small">Signed in as <strong>{user.name}</strong> (<em>{role}</em>)</div>
              <button className="btn ghost" onClick={()=>{ setUser(null); setRole('Management Viewer'); setView('Dashboard') }}>Logout</button>
            </div>
          </header>

          <div className="main-layout">
            <aside className={"sidebar" + (sidebarCollapsed ? ' collapsed' : '') + (sidebarMobileOpen ? ' mobile-visible' : '')}>
              <div className="menu-header">
                <div className="menu-title">Menu</div>
                <div className="flex-spacer" />
                <button className="sidebar-toggle" onClick={()=>{ setSidebarCollapsed(s=>{ const ns = !s; try{ localStorage.setItem('spims_sidebar_collapsed', JSON.stringify(ns)) }catch(e){}; return ns }) }} title="Toggle sidebar" aria-expanded={!sidebarCollapsed} aria-label="Toggle sidebar">
                  {/* hamburger icon (three lines) */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="18" height="2" rx="1" fill="#0369A1"/><rect x="3" y="11" width="18" height="2" rx="1" fill="#0369A1"/><rect x="3" y="16" width="18" height="2" rx="1" fill="#0369A1"/></svg>
                </button>
              </div>
              <div className="menu-list">
                {visibleViewsForRole(role).map(v => (
                  <button key={v} className={`tab ${view===v ? 'active' : ''}`} onClick={()=>{ setView(v); setSidebarMobileOpen(false) }} aria-current={view===v? 'page' : undefined}>
                    <span className="nav-icon" aria-hidden="true">{
                      ({
                        Dashboard: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="8" height="8" rx="1" fill="#0369A1"/><rect x="13" y="3" width="8" height="4" rx="1" fill="#0369A1"/><rect x="13" y="9" width="8" height="12" rx="1" fill="#0369A1"/></svg>
                        ),
                        Vendors: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#0369A1"/></svg>
                        ),
                        Suppliers: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h18v2H3zM3 11h12v2H3zM3 3h18v2H3z" fill="#0369A1"/></svg>
                        ),
                        Materials: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l9 4.5v9L12 22 3 15.5v-9L12 2z" fill="#0369A1"/></svg>
                        ),
                        Production: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8v8H3zM13 3h8v18h-8z" fill="#0369A1"/></svg>
                        ),
                        QC: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7v6c0 5 5 9 10 9s10-4 10-9V7l-10-5zm-1 14l-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7z" fill="#0369A1"/></svg>
                        ),
                        Purchase: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-2h10V6H7v10zM17 4H7V2h10v2z" fill="#0369A1"/></svg>
                        ),
                        Reports: (
                          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h2v6H3zM7 9h2v10H7zM11 5h2v14h-2z" fill="#0369A1"/></svg>
                        )
                      })[v]}
                    </span>
                    <span className="label">{v}</span>
                  </button>
                ))}
              </div>
              <div className="sidebar-user">
                <div className="muted small">Signed in as <strong>{user.name}</strong> (<em>{role}</em>)</div>
                <div className="user-actions">
                  <button className="btn ghost" onClick={()=>{ setUser(null); setRole('Management Viewer'); setView('Dashboard') }}>Logout</button>
                </div>
              </div>
            </aside>

            <main className="main-content">
              {view==='Dashboard' && <Dashboard materials={materials} productionLog={productionLog} vendors={vendors} notify={notify} confirm={showConfirm} />}
              {view==='Vendors' && <Vendors vendors={vendors} setVendors={setVendors} canEdit={perms[role].edit} notify={notify} confirm={showConfirm} />}
              {view==='Suppliers' && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} canEdit={perms[role].edit} notify={notify} confirm={showConfirm} />}
              {view==='Materials' && <Materials materials={materials} setMaterials={setMaterials} createGRN={createGRN} inspectMaterial={inspectMaterialWithUser} canQC={perms[role].qc} notify={notify} confirm={showConfirm} user={user} />}
              {view==='Production' && <Production boms={boms} materials={materials} calcRequirements={calcRequirements} autoGeneratePR={autoGeneratePR} runProduction={runProduction} setBoms={setBoms} canProduce={perms[role].produce} productionLog={productionLog} plannedProductions={plannedProductions} addPlannedProduction={addPlannedProduction} startPlannedProduction={startPlannedProduction} updatePlannedProduction={updatePlannedProduction} completePlannedProduction={completePlannedProduction} notify={notify} confirm={showConfirm} schedulePlanWithOptions={schedulePlanWithOptions} />}
              {view==='QC' && <QC materials={materials} inspectMaterial={inspectMaterialWithUser} productionLog={productionLog} inspectFinishedGood={inspectFinishedGoodWithUser} canQC={perms[role].qc} notify={notify} confirm={showConfirm} user={user} />}
              {view==='Purchase' && <Purchase materials={materials} autoGeneratePR={autoGeneratePR} calcRequirements={calcRequirements} notify={notify} confirm={showConfirm} />}
              {view==='Reports' && <Reports materials={materials} productionLog={productionLog} vendors={vendors} notify={notify} confirm={showConfirm} />}
            </main>
          </div>

          <div className="tip muted small">Tip: data is stored in browser localStorage. To reset clear site data.</div>
          {/* Toasts */}
          <div className="toasts-container">
            {toasts.map(t=> (
              <div key={t.id} className={`toast ${t.type==='warn'?'warn': t.type==='danger'?'danger':''}`}>{t.message}</div>
            ))}
          </div>
          {/* Confirm modal */}
          {confirmState.open && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div style={{marginBottom:12}}>{confirmState.message}</div>
                <div className="modal-actions">
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
