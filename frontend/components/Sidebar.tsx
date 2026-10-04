'use client'
import { useState } from 'react'
import { LayoutDashboard, Droplets, Factory, Beaker, Percent, Wrench, BarChart3, Bell, Settings, Tag, CreditCard, Users, ChevronLeft, Menu } from 'lucide-react'

export default function Sidebar({ collapsed, setCollapsed }: any) {
  const Section = ({ title, children }: any) => (
    <div className="mt-6">
      {!collapsed && <p className="px-4 text-[10px] tracking-widest text-gray-500 mb-2">{title}</p>}
      {children}
    </div>
  )
  const Item = ({ icon: Icon, label, active=false }: any) => (
    <div className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/5 ${active? 'bg-white/10 border-l-2 border-emerald-400' : ''}`}>
      <Icon size={18} /> {!collapsed && <span className="text-sm">{label}</span>}
    </div>
  )

  return (
    <div className={`${collapsed? 'w-[64px]' : 'w-[240px]'} bg-[#0a0a0a] text-white h-screen sticky top-0 transition-all flex flex-col border-r border-white/10`}>
      <div className="flex items-center justify-between p-4">
        {!collapsed && <h1 className="font-bold">ATMO.CO.KE</h1>}
        <button onClick={()=>setCollapsed(!collapsed)} className="p-1 bg-white/10 rounded"><ChevronLeft className={`${collapsed? 'rotate-180' : ''}`} size={16}/></button>
      </div>
      <div className="flex-1 overflow-auto">
        <Section title="OPERATIONS">
          <Item icon={LayoutDashboard} label="Dashboard" active />
          <Item icon={Droplets} label="Tank Levels" />
          <Item icon={Factory} label="Productions" />
          <Item icon={Beaker} label="Antiscalants projection" />
          <Item icon={Percent} label="System Recovery" />
        </Section>
        <Section title="MANAGEMENT">
          <Item icon={Wrench} label="Maintenance" />
          <Item icon={BarChart3} label="Analytics Reports" />
        </Section>
        <Section title="SYSTEM">
          <Item icon={Bell} label="Alerts Settings" />
          <Item icon={Tag} label="Tags Manager" />
          <Item icon={CreditCard} label="Billing" />
          <Item icon={Users} label="User" />
        </Section>
      </div>
      {!collapsed && <div className="p-3 text-[11px] text-gray-500">RO5: 069107032F4002485 • MQTT: broker.emqx.io:1883</div>}
    </div>
  )
}
