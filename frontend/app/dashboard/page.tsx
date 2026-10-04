'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://your-render-backend.onrender.com';

export default function ExecutiveDashboard(){
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [edit, setEdit] = useState(false)
  const [visibleTags, setVisibleTags] = useState<string[]>([])

  // 1. Load which system this logged-in user belongs to
  useEffect(()=>{
    const systemId = localStorage.getItem('atmo_systemId') || 'ro5-naivasha'
    fetch(`${API}/api/config/${systemId}`)
     .then(r=>r.json())
     .then(cfg=>{
        setConfig(cfg)
        // auto show all widgets unless user hid some before
        const saved = localStorage.getItem(`visible_${cfg.id}`)
        if(saved) setVisibleTags(JSON.parse(saved))
        else setVisibleTags(cfg.widgets.map((w:any)=>w.tag))
      })
  },[])

  // 2. Live MQTT data from your backend
  useEffect(()=>{
    const fetchLive = () => {
      fetch(`${API}/api/status`).then(r=>r.json()).then(setData).catch(()=>{})
    }
    fetchLive()
    const int = setInterval(fetchLive, 3000)
    return ()=>clearInterval(int)
  },[])

  const toggleTag = (tag:string)=>{
    const next = visibleTags.includes(tag)? visibleTags.filter(t=>t!==tag) : [...visibleTags, tag]
    setVisibleTags(next)
    if(config) localStorage.setItem(`visible_${config.id}`, JSON.stringify(next))
  }

  if(!config) return <div className="flex"><Sidebar/><div className="p-10">Loading system config from JSON...</div></div>

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar/>
      <div className="flex-1">
        {/* Top Bar - now shows dynamic RO number from JSON */}
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h1 className="font-bold">{config.name} — {config.roNumber}</h1>
            <p className="text-xs text-zinc-500">{config.mqtt.topicRoot} • {config.mqtt.broker}:{config.mqtt.port}</p>
          </div>
          <button onClick={()=>setEdit(!edit)} className="border px-4 py-1.5 rounded text-sm">
            {edit? 'Done' : 'Edit Dashboard'}
          </button>
        </div>

        {/* Edit mode - admin can hide/show tags without code */}
        {edit && (
          <div className="bg-white border m-4 p-4 rounded-xl">
            <h3 className="font-semibold text-sm mb-3">Toggle Cards (Admin - no code needed)</h3>
            <div className="flex flex-wrap gap-2">
              {config.widgets.map((w:any)=><button key={w.id} onClick={()=>toggleTag(w.tag)} className={`px-3 py-1.5 rounded-full text-xs border ${visibleTags.includes(w.tag)? 'bg-black text-white' : 'bg-white'}`}>{w.label}</button>)}
            </div>
          </div>
        )}

        {/* Dynamic Cards - from JSON, not hardcoded! */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {config.widgets.filter((w:any)=>visibleTags.includes(w.tag)).map((w:any)=>{
            // try to get live value: data[w.mqttPath] or data[w.tag] or random demo
            const liveVal = data?.[w.mqttPath]?? data?.[w.tag]?? data?.[w.mqttPath.split('/').pop()]?? '--'
            return (
              <div key={w.id} className="bg-white border rounded-xl p-5 shadow-sm">
                <p className="text-[11px] tracking-widest text-zinc-500">{w.tag}</p>
                <p className="text-sm text-zinc-400 mt-1">{w.label}</p>
                <p className="text-3xl font-bold mt-3">{liveVal} <span className="text-sm font-normal text-zinc-500">{w.unit}</span></p>
                <div className="mt-3 h-1 bg-zinc-100 rounded"><div className="h-1 bg-black rounded" style={{width: '60%'}}></div></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
