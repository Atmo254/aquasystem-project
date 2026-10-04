'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function ExecutiveDashboard(){
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState<any>(null)
  const [edit, setEdit] = useState(false)
  const [visibleTags, setVisibleTags] = useState<string[]>([
    'RO5-FEEDFlow m3/h','RO5-Permeateflow M3/h','RO5-ConcetrateFlow M3/h',
    'RO5-ROPressure bar','RO5-InterstagePress bar','RO5-ConcetratePress bar',
    'RO5-Stage1Delta bar','RO5-Stage2Delta bar','RO5-MediaFilterInPress bar',
    'RO5-MediaFilterOutPress bar','RO5-MediaFilterDeltaP bar','RO5-SystemRecovery %',
    'RO5-PureWaterEc S/m','RO5-FeedTankLevel %','RO5-AntiscalantDoser ml/hr','RO5-AntiscalantDaily ml'
  ])

  useEffect(()=>{
    const load = async()=>{ const r=await fetch('/api/status',{cache:'no-store'}); setData(await r.json()) }
    load(); const id=setInterval(load,3000); return()=>clearInterval(id)
  },[])

  if(!data) return <div className="p-10">Loading LIVE RO5...</div>
  const v = (name:string) => data.allValues?.[name]?? 0

  return(
    <div className="flex bg-[#f6f7f8] min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">RO5 Executive • Live Production</h1>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs ${data.feedFlow>0?'bg-green-500 text-white':'bg-red-500 text-white'}`}>{data.mqttStatus || 'Live'}</span>
            <button onClick={()=>setEdit(!edit)} className="px-4 py-1 bg-black text-white rounded text-sm">{edit?'Done Editing':'Edit Dashboard'}</button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-black text-white p-5 rounded-2xl"><p className="text-xs opacity-60">FEED Flow</p><h2 className="text-3xl font-bold mt-2">{v('RO5-FEEDFlow m3/h')} <span className="text-sm">m³/h</span></h2></div>
          <div className="bg-white border p-5 rounded-2xl"><p className="text-xs opacity-60">Permeate Flow</p><h2 className="text-3xl font-bold mt-2 text-emerald-600">{v('RO5-Permeateflow M3/h')} m³/h</h2></div>
          <div className="bg-white border p-5 rounded-2xl"><p className="text-xs opacity-60">System Recovery</p><h2 className="text-3xl font-bold mt-2">{v('RO5-SystemRecovery %')} %</h2><div className="w-full h-2 bg-gray-200 rounded mt-2"><div className="h-2 bg-emerald-500 rounded" style={{width:`${v('RO5-SystemRecovery %')}%`}}></div></div></div>
          <div className="bg-white border p-5 rounded-2xl"><p className="text-xs opacity-60">Feed Tank Level</p><h2 className="text-3xl font-bold mt-2">{v('RO5-FeedTankLevel %')} %</h2></div>
        </div>

        {/* All Sensors Grid - EDITABLE */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {visibleTags.map(tag=>(
            <div key={tag} className="bg-white border rounded-xl p-4 relative">
              {edit && <button onClick={()=>setVisibleTags(visibleTags.filter(t=>t!==tag))} className="absolute top-2 right-2 text-xs bg-red-100 px-2 rounded">x</button>}
              <p className="text-[11px] text-gray-500 uppercase">{tag}</p>
              <p className="text-xl font-semibold mt-1">{v(tag)} <span className="text-xs font-normal">{tag.split(' ').pop()}</span></p>
            </div>
          ))}
          {edit && (
            <div className="bg-dashed border-2 border-dashed rounded-xl p-4">
              <p className="text-xs mb-2">Add Tag from MQTT</p>
              <select onChange={(e)=>{ if(e.target.value &&!visibleTags.includes(e.target.value)) setVisibleTags([...visibleTags, e.target.value]) }} className="w-full border p-2 text-sm rounded">
                <option value="">+ Add new tag</option>
                {Object.keys(data.allValues || {}).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Antiscalant + Alarms */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-bold">Antiscalant Projection</h3>
            <div className="flex gap-6 mt-4">
              <div><p className="text-xs text-gray-500">Doser ml/hr</p><p className="text-2xl font-bold">{v('RO5-AntiscalantDoser ml/hr')}</p></div>
              <div><p className="text-xs text-gray-500">Daily ml</p><p className="text-2xl font-bold">{v('RO5-AntiscalantDaily ml')}</p></div>
              <div><p className="text-xs text-gray-500">Projected 30d</p><p className="text-2xl font-bold">{(v('RO5-AntiscalantDaily ml')*30/1000).toFixed(1)} L</p></div>
            </div>
          </div>
          <div className="bg-[#111] text-white rounded-xl p-5">
            <h3 className="font-bold">Alarms</h3>
            <div className="mt-3 space-y-2 text-sm">
              {v('RO5-ROPressure bar')>15 && <p className="text-red-400">⚠ High RO Pressure: {v('RO5-ROPressure bar')} bar</p>}
              {v('RO5-MediaFilterDeltaP bar')>1.5 && <p className="text-orange-400">⚠ Media Filter DeltaP high: {v('RO5-MediaFilterDeltaP bar')}</p>}
              {v('RO5-FeedTankLevel %')<20 && <p className="text-yellow-400">⚠ Low Feed Tank: {v('RO5-FeedTankLevel %')}%</p>}
              {v('RO5-PureWaterEc S/m')>0.1 && <p className="text-red-400">⚠ High EC: {v('RO5-PureWaterEc S/m')}</p>}
              {!(v('RO5-ROPressure bar')>15 || v('RO5-MediaFilterDeltaP bar')>1.5) && <p className="text-green-400">✓ All systems normal</p>}
            </div>
            <p className="text-[10px] opacity-50 mt-4">Last: {data.lastUpdate}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
