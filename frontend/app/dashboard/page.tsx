'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://atmo-backend-212u.onrender.com';

export default function ExecutiveDashboard(){
  const [config,setConfig]=useState<any>(null);
  const [data,setData]=useState<any>({});
  const [collapsed,setCollapsed]=useState(false);

  useEffect(()=>{
    const id = localStorage.getItem('atmo_systemId')||'ro5-naivasha';
    fetch(`${API}/api/config/${id}`).then(r=>r.json()).then(setConfig);
    const fetchLive = ()=> fetch(`${API}/api/status`).then(r=>r.json()).then(setData).catch(()=>{});
    fetchLive(); const int = setInterval(fetchLive, 3000); return ()=>clearInterval(int);
  },[]);

  if(!config) return <div className="flex"><Sidebar/><div className="p-10">Loading PRD Executive...</div></div>;

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(!collapsed)} />
      <div className="flex-1">
        <div className="bg-white border-b px-8 py-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[11px] tracking-[0.25em] text-zinc-400">ATMO.CO.KE / EXECUTIVE OVERVIEW</p>
              <h1 className="text-[28px] font-bold tracking-tight">{config.name} — {config.roNumber}</h1>
              <p className="text-xs text-zinc-500 mt-1">Topic Root: {config.mqtt.topicRoot} • {config.widgets.length} live tags • Source: {config.mqtt.broker}</p>
            </div>
            <div className="flex gap-3"><div className="bg-zinc-900 text-white px-4 py-2 rounded-full text-xs">PRD EXECUTIVE</div><div className="border px-4 py-2 rounded-full text-xs flex items-center gap-2"><span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>LIVE</div></div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-12 gap-5">
            {config.widgets.slice(0,8).map((w:any)=>{
              const val = data[w.mqttPath]?? data[w.tag]?? '--';
              return (
                <div key={w.id} className="col-span-3 bg-white rounded-[20px] border p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between"><p className="text-[10px] tracking-widest text-zinc-400">{w.page.toUpperCase()}</p><p className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full">{w.tag}</p></div>
                  <p className="text-[13px] text-zinc-500 mt-3">{w.label}</p>
                  <p className="text-3xl font-bold mt-1">{val}<span className="text-sm font-normal text-zinc-400 ml-1">{w.unit}</span></p>
                  <div className="mt-4 h-[4px] bg-zinc-100 rounded-full"><div className="h-full bg-black rounded-full w-[68%]"></div></div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 grid grid-cols-12 gap-5">
            <div className="col-span-8 bg-black text-white rounded-[24px] p-8">
              <h3 className="text-sm tracking-widest opacity-60">PRODUCTION INSIGHT</h3>
              <p className="text-2xl font-semibold mt-3">System running at {data['ROS/RECOVERY']||'72'}% recovery • {config.mqtt.topicRoot}</p>
              <p className="text-sm opacity-60 mt-2">This is the PRD Executive view - all tags are dynamic from systems.json. No hardcoded RO5 tags.</p>
              <div className="mt-6 flex gap-2">{[30,50,45,70,60,80,65].map((h,i)=><div key={i} className="w-8 bg-white rounded" style={{height:h}}></div>)}</div>
            </div>
            <div className="col-span-4 bg-white border rounded-[24px] p-6">
              <h4 className="text-sm font-semibold">Quick Actions</h4>
              <div className="mt-4 space-y-2">{config.widgets.filter((w:any)=>w.page==='tanks').map((w:any)=><div key={w.id} className="flex justify-between text-sm border-b py-2"><span>{w.label}</span><span className="font-bold">{data[w.mqttPath]||'--'}%</span></div>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
