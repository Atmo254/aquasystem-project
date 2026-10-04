'use client'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  
  useEffect(()=>{
    const fetchData = async ()=>{
      try {
        // Use YOUR proxy - this always works
        const res = await fetch(`/api/status`, { cache: 'no-store' })
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
    const id = setInterval(fetchData, 2000)
    return ()=> clearInterval(id)
  },[])
  
  if(!data) return <div style={{padding:20}}>Loading Atmo Live... Connecting to 069107032F4002485</div>
  
  return (
    <div style={{padding:20, fontFamily:'sans-serif', maxWidth:1200}}>
      <h1>💧 Atmo.co.ke - LIVE SCADA - RO5</h1>
      <p style={{color: data.feedFlow > 0 ? 'green' : 'red'}}>● {data.feedFlow > 0 ? 'LIVE from MQTT 1883' : 'Waiting for data'} | {data.lastUpdate}</p>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:15, marginTop:20}}>
        <div style={{background:'#000',color:'#0f0',padding:15, borderRadius:10}}>
          <h3>RO5-FEEDFlow m3/h</h3>
          <h2 style={{fontSize:32}}>{data.feedFlow ?? data.allValues?.['RO5-FEEDFlow m3/h'] ?? 0}</h2>
        </div>
        <div style={{background:'#001a33',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-Permeateflow M3/h</h3>
          <h2 style={{fontSize:32}}>{data.permeateFlow ?? data.allValues?.['RO5-Permeateflow M3/h'] ?? 0}</h2>
        </div>
        <div style={{background:'#330000',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-ConcetrateFlow M3/h</h3>
          <h2 style={{fontSize:32}}>{data.concentrateFlow ?? 0}</h2>
        </div>
        <div style={{background:'#222',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-ROPressure bar</h3>
          <h2>{data.roPressure ?? 0} bar</h2>
        </div>
        <div style={{background:'#222',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-FeedTankLevel %</h3>
          <h2>{data.feedTankLevel ?? data.tankLevel ?? 0} %</h2>
          <div style={{background:'#555',height:10, borderRadius:5, marginTop:10}}>
            <div style={{width:`${data.feedTankLevel ?? 0}%`, background:'#0f0', height:10, borderRadius:5}}></div>
          </div>
        </div>
        <div style={{background:'#222',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-SystemRecovery %</h3>
          <h2>{data.systemRecovery ?? 0} %</h2>
        </div>
        <div style={{background:'#222',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-PureWaterEc S/m</h3>
          <h2>{data.pureWaterEc ?? 0}</h2>
        </div>
        <div style={{background:'#222',color:'#fff',padding:15, borderRadius:10}}>
          <h3>RO5-InterstagePress</h3>
          <h2>{data.interstagePress ?? 0} bar</h2>
        </div>
      </div>

      <div style={{marginTop:30, background:'#f5f5f5', padding:15, borderRadius:10}}>
        <h3>All MQTT Sensors (Exact Names from 069107032F4002485)</h3>
        <pre style={{fontSize:12, overflow:'auto', background:'#000', color:'#0f0', padding:15, borderRadius:8}}>
          {JSON.stringify(data.allValues || data, null, 2)}
        </pre>
      </div>

      <p style={{marginTop:20, color:'green'}}>● LIVE at {new Date().toLocaleString()} - Port 1883</p>
    </div>
  )
}
