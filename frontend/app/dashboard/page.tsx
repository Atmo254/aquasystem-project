'use client'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  useEffect(()=>{
    const fetchData = async ()=>{
      const res = await fetch('http://192.168.100.120:5000/api/pumps/status')
      setData(await res.json())
    }
    fetchData()
    const id = setInterval(fetchData, 2000)
    return ()=> clearInterval(id)
  },[])
  
  if(!data) return <div>Loading Atmo Live...</div>
  
  return (
    <div style={{padding:20, fontFamily:'sans-serif'}}>
      <h1>💧 Atmo.co.ke - LIVE SCADA</h1>
      <div style={{background:'#000',color:'#0f0',padding:15, borderRadius:10}}>
        <h2>PUMP 1: {data.pump1?.status || data.status} - {data.pump1?.pressure || data.pressure} bar</h2>
        <p>Flow: {data.pump1?.flow || 0} L/min | Level: {data.tankLevel || 0}%</p>
        <p>Last: {data.lastUpdate}</p>
      </div>
      <div style={{marginTop:20}}>
        <h3>CIP Cycles</h3>
        <p>Active: {data.cip?.cycle || 'CIP-01'}</p>
        <p>Status: <b style={{color: data.pump1?.status==='ON'?'green':'orange'}}>{data.cip?.status || data.pump1?.status || 'IDLE'}</b></p>
      </div>
      <hr/>
      <h4>Atmo.co.ke</h4>
      <p>Publish test data from anywhere:</p>
      <code style={{background:'#eee',padding:10,display:'block'}}>
        Topic: atmo/pump1<br/>
        {"{"}"status":"ON","pressure":3.2,"flow":120{"}"}
      </code>
      <p style={{marginTop:10, color:'green'}}>● LIVE at {new Date().toISOString()}</p>
    </div>
  )
}