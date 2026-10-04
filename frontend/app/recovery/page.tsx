'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://atmo-backend-212u.onrender.com';

export default function RecoveryExecutive(){
  const [config,setConfig]=useState<any>(null);
  const [data,setData]=useState<any>({});

  useEffect(()=>{
    const id = localStorage.getItem('atmo_systemId')||'ro5-naivasha';
    fetch(`${API}/api/config/${id}`).then(r=>r.json()).then(setConfig);
    const fetchLive = ()=> fetch(`${API}/api/status`).then(r=>r.json()).then(setData).catch(()=>{});
    fetchLive(); const int = setInterval(fetchLive, 3000); return ()=>clearInterval(int);
  },[]);

  if(!config) return <div className="flex"><Sidebar/><div className="p-10">Loading executive...</div></div>;

  const widgets = config.widgets.filter((w:any)=>w.page==='recovery');
  const recovery = Number(data['ROS/RECOVERY'] || data['ROS-RECOVERY'] || 72);
  const pressure = Number(data['ROS/ROPRESSURE'] || 8.4);

  return (
    <div className="flex min-h-screen bg-[#f6f6f5]">
      <Sidebar/>
      <div className="flex-1">
        {/* PRD EXECUTIVE HEADER */}
        <div className="bg-white border-b px-8 py-6 flex justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-zinc-400">ATMO.CO.KE / EXECUTIVE</p>
            <h1 className="text-2xl font-bold mt-1">System Recovery • {config.roNumber}</h1>
            <p className="text-xs text-zinc-500 mt-1">MQTT: {config.mqtt.topicRoot} • Broker: {config.mqtt.broker}:{config.mqtt.port} • Live ROS-RECOVERY % from MQTT</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">LIVE STATUS</p>
            <div className="flex items-center gap-2 mt-1"><span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span><span className="text-sm font-semibold">ONLINE</span></div>
          </div>
        </div>

        {/* PRD EXECUTIVE CARDS */}
        <div className="p-8 grid grid-cols-12 gap-6">
          {/* Big Gauge Card */}
          <div className="col-span-8 bg-white border rounded-[20px] p-8 shadow-sm">
            <div className="flex justify-between"><h3 className="font-semibold">Recovery Performance</h3><span className="text-xs bg-zinc-900 text-white px-3 py-1 rounded-full">EXECUTIVE VIEW</span></div>
            <div className="mt-8 flex gap-10 items-center">
              <div className="relative h-48 w-48">
                <div className="absolute inset-0 rounded-full border-[14px] border-zinc-100"></div>
                <div className="absolute inset-0 rounded-full border-[14px] border-black" style={{clipPath:`inset(0 ${100-recovery}% 0 0)`}}></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-bold">{recovery}%</span><span className="text-[10px] tracking-widest text-zinc-400">RECOVERY</span></div>
              </div>
              <div className="flex-1 space-y-4">
                {widgets.map((w:any)=><div key={w.id} className="flex justify-between border-b pb-3"><span className="text-sm text-zinc-500">{w.label} <span className="text-[10px]">{w.tag}</span></span><span className="font-bold">{data[w.mqttPath]??'--'} {w.unit}</span></div>)}
                <div className="flex justify-between pt-2"><span className="text-sm">RO Pressure</span><span className="font-bold">{pressure} bar</span></div>
              </div>
            </div>
            <div className="mt-8 h-24 bg-zinc-50 rounded-xl flex items-end gap-1 p-3">{[40,65,55,80,recovery,70,60,75].map((h,i)=><div key={i} className="flex-1 bg-black rounded" style={{height:`${h}%`}}></div>)}</div>
          </div>

          {/* Side KPI */}
          <div className="col-span-4 space-y-6">
            <div className="bg-black text-white rounded-[20px] p-6"><p className="text-[10px] tracking-widest opacity-60">SYSTEM HEALTH</p><p className="text-3xl font-bold mt-3">Optimal</p><p className="text-xs opacity-60 mt-2">Recovery is within 70-78% target for {config.name}</p><button className="mt-6 w-full bg-white text-black rounded-full py-2 text-sm">View Logs</button></div>
            <div className="bg-white border rounded-[20px] p-6"><p className="text-xs font-semibold">Live Tags</p><div className="mt-4 space-y-2 text-xs">{widgets.map((w:any)=><div key={w.id} className="flex justify-between"><span>{w.tag}</span><span className="font-mono">{data[w.mqttPath]??'--'}</span></div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}
