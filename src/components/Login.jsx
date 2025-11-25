import React, { useState } from 'react'

export default function Login({onLogin, users}){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [remember, setRemember] = useState(false)

  function submit(e){
    e && e.preventDefault()
    const user = (users||[]).find(u => u.username === username && u.password === password)
    if(!user){ setErr('Invalid username or password'); return }
    setErr('')
    onLogin && onLogin(user)
  }

  function quickLogin(u){
    setUsername(u.username); setPassword(u.password); setErr('')
    setTimeout(()=> onLogin && onLogin(u), 300)
  }

  return (
    <div style={{minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
      <div style={{display:'flex', width:900, boxShadow:'0 12px 40px rgba(0,0,0,0.12)', borderRadius:12, overflow:'hidden'}}>
        <div style={{background: 'linear-gradient(135deg,#0b5 0%, #06a 100%)', color:'#fff', padding:28, width:320, display:'flex', flexDirection:'column', gap:12}}>
          <div style={{fontSize:22, fontWeight:700}}>SPIMS</div>
          <div style={{opacity:0.95}}>Simple Production & Inventory Management System</div>
          <div style={{marginTop:'auto', fontSize:13, opacity:0.95}}>
            Demo users
            <ul style={{paddingLeft:16, marginTop:8}}>
              {users.map(u => <li key={u.username} style={{marginBottom:6}}><strong>{u.username}</strong> — <span style={{opacity:0.95}}>{u.role}</span></li>)}
            </ul>
          </div>
        </div>

        <div style={{background:'#fff', padding:28, flex:1}}>
          <h3 style={{marginTop:0}}>Sign in to SPIMS</h3>
          <p className="muted small">Enter your credentials below. This demo doesn't store passwords securely.</p>

          <form onSubmit={submit} style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div style={{gridColumn:'1 / span 2'}}>
              <label className="muted small">Username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" />
            </div>

            <div style={{gridColumn:'1 / span 2'}}>
              <label className="muted small">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
            </div>

            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="checkbox" id="remember" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <label htmlFor="remember" className="muted small">Remember me</label>
            </div>

            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn ghost" type="button" onClick={()=>{ setUsername(''); setPassword(''); setErr('') }}>Clear</button>
              <button className="btn primary" style={{marginLeft:8}} onClick={submit}>Sign in</button>
            </div>

            {err && <div style={{gridColumn:'1 / span 2'}} className="danger small">{err}</div>}

            <div style={{gridColumn:'1 / span 2', marginTop:6}}>
              <div className="muted small" style={{marginBottom:8}}>Quick login</div>
              <div style={{display:'flex', gap:8}}>
                {users.map(u => <button key={u.username} type="button" className="btn" onClick={()=>quickLogin(u)}>{u.role}</button>)}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
