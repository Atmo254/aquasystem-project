'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://atmo-backend-212u.onrender.com';
export default function Page(){
  const [config,setConfig]=useState<any>(null); const [data,setData]=useState<any>({});
  useEffect(()=>{ const id = localStorage.getItem('atmo_systemId')||'ro5-naivasha'; fetch(`${API}/api/config/${id}`).then(r=>r.json()).then(setConfig); fetch(`${API}/api/status`).then(r=>r.json()).then(setData).catch(()=>{}); },[]);
  if(!config) return <div className="flex"><Sidebar/><div className="p-10">Loading...</div></div>;
  // Tags manager shows ALL widgets, not filtered
  const widgets = config.widgets;
  return <div className="flex min-h-screen bg-zinc-50"><Sidebar/><div className="flex-1 p-6"><h1 className="text-xl font-bold">Tags Manager • {config.mqtt.topicRoot}</h1><p className="text-sm text-zinc-500">Manage logins for this system • MQTT: {config.mqtt.topicRoot} • Total: {widgets.length} tags</p><div className="grid grid-cols-3 gap-4 mt-6">{widgets.map((w:any)=><div key={w.id} className="bg-white border rounded-xl p-5"><p className="text-[11px] text-zinc-500">{w.tag} • {w.page}</p><p className="text-sm font-bold mt-2">{w.label} - {w.mqttPath}</p><p className="text-xs text-zinc-400 mt-1">{data[w.mqttPath]??'--'} {w.unit}</p></div>)}</div></div></div>
}
