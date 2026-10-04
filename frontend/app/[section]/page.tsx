'use client'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://atmo-backend-212u.onrender.com';

const TITLES: any = {
  tanks: { title: 'Tank Levels', desc: 'Raw, Permeate, Brine tanks live levels' },
  production: { title: 'Productions', desc: 'Daily production M³ from MQTT' },
  antiscalant: { title: 'Antiscalants Projection', desc: 'Dosing projection & chemical usage' },
  recovery: { title: 'System Recovery', desc: 'Live ROS-RECOVERY %' },
  maintenance: { title: 'Maintenance', desc: 'Service logs, filter changes' },
  analytics: { title: 'Analytics Reports', desc: 'Trends from /api/trends' },
  alerts: { title: 'Alerts Settings', desc: 'Configure WhatsApp/Email alerts' },
  tags: { title: 'Tags Manager', desc: 'Edit all RO tags for this MQTT topic' },
  billing: { title: 'Billing', desc: 'Usage & subscription' },
  user: { title: 'User Management', desc: 'Manage logins for this system' },
}

export default function SectionPage(){
  const params = useParams()
  const section = params.section as string
  const [data,setData]=useState<any>(null)
  const [config,setConfig]=useState<any>(null)

  useEffect(()=>{
    const sysId = localStorage.getItem('atmo_systemId') || 'ro5-naivasha'
    fetch(`${API}/api/config/${sysId}`).then(r=>r.json()).then(setConfig).catch(()=>{})
    fetch(`${API}/api/status`).then(r=>r.json()).then(setData).catch(()=>{})
  },[])

  const info = TITLES[section] || { title: section, desc: '' }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar/>
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold">{info.title}</h1>
        <p className="text-zinc-500 text-sm mt-1">{info.desc} • MQTT: {config?.mqtt?.topicRoot || '069107032F4002485/#'}</p>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {config?.widgets?.slice(0,6).map((w:any)=>(
            <div key={w.id} className="bg-white border rounded-xl p-5">
              <p className="text-[11px] text-zinc-500">{w.tag}</p>
              <p className="text-xl font-bold mt-2">{data?.[w.mqttPath] || data?.[w.tag] || '--'} {w.unit}</p>
              <p className="text-xs text-zinc-400">{w.label}</p>
            </div>
          )) || (
            <>
              <div className="bg-white border rounded-xl p-8">Live data from {API}/api/status</div>
              <div className="bg-white border rounded-xl p-8">No config yet - go to /admin to add widgets</div>
            </>
          )}
        </div>

        <div className="mt-8 bg-black text-white rounded-xl p-6">
          <p className="text-sm">This page is dynamic - it reads tags from systems.json for user: {localStorage.getItem('atmo_username') || 'admin'}</p>
          <p className="text-xs text-zinc-400 mt-2">To add new customer: /admin → Add System with his MQTT → Add User. No code needed.</p>
        </div>
      </div>
    </div>
  )
}
