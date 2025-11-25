import React, { useState } from 'react'

export default function Login({onLogin, users}){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function submit(e){
    e && e.preventDefault()
    const user = (users||[]).find(u => u.username === username && u.password === password)
    if(!user){ setErr('Invalid username or password'); return }
    setErr('')
    onLogin && onLogin(user)
  }

  return (
    <div style={{minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="card" style={{width:420}}>
        <h3 style={{marginTop:0}}>Sign in</h3>
        <div className="muted small">Use demo users: admin/admin (Admin), planner/planner (Production Planner), qc/qc (Quality Inspector)</div>
        <form onSubmit={submit} style={{marginTop:12, display:'flex', flexDirection:'column', gap:10}}>
          <div>
            <label className="muted small">Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" />
          </div>
          <div>
            <label className="muted small">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
          </div>
          {err && <div className="danger small">{err}</div>}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div className="muted small">Demo only — no real auth.</div>
            <div>
              <button className="btn ghost" type="button" onClick={()=>{ setUsername(''); setPassword(''); setErr('') }}>Clear</button>
              <button className="btn primary" style={{marginLeft:8}} onClick={submit}>Sign in</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
