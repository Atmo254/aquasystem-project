"use client"
import {useEffect, useState} from 'react'
const API = process.env.NEXT_PUBLIC_API_URL || 'https://your-render-backend.onrender.com';

export default function Admin(){
  const [db,setDb]=useState<any>(null)
  const [sys,setSys]=useState<any>({id:'',name:'',roNumber:'', mqtt:{broker:'broker.emqx.io', port:1883, topicRoot:'', wsUrl:'wss://broker.emqx.io:8084/mqtt'}, widgets:[]})
  const [user,setUser]=useState({username:'',password:'',systemId:''})

  useEffect(()=>{ fetch(`${API}/api/admin/all`).then(r=>r.json()).then(setDb) },[])

  const saveSystem = async()=>{
    if(!sys.id) sys.id = sys.name.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now()
    await fetch(`${API}/api/admin/system`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sys)})
    alert('System Saved! Now users with this systemId will see new dashboard'); location.reload()
  }
  const saveUser = async()=>{
    await fetch(`${API}/api/admin/user`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(user)})
    alert('User Added!'); location.reload()
  }
  const addWidget = ()=>{
    const label = prompt('Card Label e.g. TANK LEVEL 1')
    const tag = prompt('Display Tag e.g. TANK-LEVEL-1 %')
    const mqttPath = prompt('MQTT sub-path e.g. TANK/LEVEL1 - will listen to {topicRoot}/{mqttPath}')
    const unit = prompt('Unit e.g. %, m3/h, bar') || ''
    if(!label) return
    setSys({...sys, widgets:[...sys.widgets, {id:Date.now().toString(), label, tag, mqttPath, unit, type:'small'}]})
  }

  if(!db) return <div className="p-10">Loading...</div>

  return (
    <div className="p-6 bg-zinc-50 min-h-screen">
      <h1 className="text-2xl font-bold">ATMO Super Admin - Duplicate Systems</h1>
      <p className="text-zinc-500 text-sm">Edit dashboard without code. JSON mode.</p>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold">1. Create / Edit System</h3>
          <input placeholder="System Name e.g. Kericho RO3" value={sys.name} onChange={e=>setSys({...sys,name:e.target.value, mqtt:{...sys.mqtt, topicRoot: e.target.value.replace(/\s+/g,'').toUpperCase()+'/#'}})} className="w-full border p-2 rounded mt-3"/>
          <input placeholder="RO Number" value={sys.roNumber} onChange={e=>setSys({...sys,roNumber:e.target.value})} className="w-full border p-2 rounded mt-2"/>
          <input placeholder="MQTT Topic Root e.g. 0712345678/#" value={sys.mqtt.topicRoot} onChange={e=>setSys({...sys,mqtt:{...sys.mqtt,topicRoot:e.target.value}})} className="w-full border p-2 rounded mt-2"/>
          <input placeholder="Broker e.g. broker.emqx.io" value={sys.mqtt.broker} onChange={e=>setSys({...sys,mqtt:{...sys.mqtt,broker:e.target.value}})} className="w-full border p-2 rounded mt-2"/>

          <div className="mt-4">
            <div className="flex justify-between"><span className="font-medium">Dashboard Cards (Widgets)</span><button onClick={addWidget} className="bg-black text-white px-3 py-1 rounded text-xs">+ Add Card</button></div>
            <div className="mt-2 space-y-2">
              {sys.widgets.map((w:any,i:number)=><div key={w.id} className="border p-2 rounded text-xs flex justify-between"><span>{w.label} → {w.tag} ({w.mqttPath}) [{w.unit}]</span><button onClick={()=>setSys({...sys,widgets:sys.widgets.filter((_:any,idx:number)=>idx!==i)})} className="text-red-500">x</button></div>)}
            </div>
          </div>
          <button onClick={saveSystem} className="w-full bg-black text-white py-2 rounded mt-4">Save System</button>
        </div>

        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold">2. Add New User for System</h3>
            <input placeholder="Username" value={user.username} onChange={e=>setUser({...user,username:e.target.value})} className="w-full border p-2 rounded mt-3"/>
            <input placeholder="Password" value={user.password} onChange={e=>setUser({...user,password:e.target.value})} className="w-full border p-2 rounded mt-2"/>
            <select value={user.systemId} onChange={e=>setUser({...user,systemId:e.target.value})} className="w-full border p-2 rounded mt-2">
              <option value="">Select System</option>
              {db.systems.map((s:any)=><option key={s.id} value={s.id}>{s.name} - {s.roNumber}</option>)}
            </select>
            <button onClick={saveUser} className="w-full bg-zinc-800 text-white py-2 rounded mt-3">Add User</button>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold">Existing Systems (Click to Edit)</h3>
            {db.systems.map((s:any)=><div key={s.id} onClick={()=>setSys(s)} className="border p-3 rounded mt-2 cursor-pointer hover:bg-zinc-50"><b>{s.name}</b> - {s.mqtt.topicRoot} - {s.widgets.length} cards</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}
