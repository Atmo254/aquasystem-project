"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, Factory, Beaker, Percent, Wrench, BarChart3, Bell, Tag, CreditCard, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const ops = [
  { label: 'Tank Levels', icon: Droplets, href: '/tanks' },
  { label: 'Productions', icon: Factory, href: '/production' },
  { label: 'Antiscalants projection', icon: Beaker, href: '/antiscalant' },
  { label: 'System Recovery', icon: Percent, href: '/recovery' },
]

const mgmt = [
  { label: 'Maintenance', icon: Wrench, href: '/maintenance' },
  { label: 'Analytics Reports', icon: BarChart3, href: '/analytics' },
]

const sys = [
  { label: 'Alerts Settings', icon: Bell, href: '/alerts' },
  { label: 'Tags Manager', icon: Tag, href: '/tags' },
  { label: 'Billing', icon: CreditCard, href: '/billing' },
  { label: 'User', icon: Users, href: '/user' },
]

export default function Sidebar(){
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const Item = ({item}:any) => {
    const active = pathname === item.href
    return (
      <Link href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${active? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
        <item.icon size={18} /> {!collapsed && item.label}
      </Link>
    )
  }

  return (
    <div className={`${collapsed? 'w-[72px]' : 'w-[260px]'} bg-black text-white h-screen sticky top-0 flex flex-col p-3 border-r border-zinc-800 transition-all`}>
      <div className="flex items-center justify-between px-2 py-4">
        {!collapsed && <span className="font-bold tracking-widest">ATMO.CO.KE</span>}
        <button onClick={()=>setCollapsed(!collapsed)} className="p-1.5 bg-zinc-800 rounded"><ChevronLeft className={`${collapsed? 'rotate-180' : ''} w-4 h-4`} /></button>
      </div>

      <div className="space-y-6 overflow-auto flex-1">
        <div><p className="text-[10px] text-zinc-500 px-4 mb-2 tracking-widest">{!collapsed && 'OPERATIONS'}</p><div className="space-y-1">{ops.map(i=><Item key={i.href} item={i}/>)}</div></div>
        <div><p className="text-[10px] text-zinc-500 px-4 mb-2 tracking-widest">{!collapsed && 'MANAGEMENT'}</p><div className="space-y-1">{mgmt.map(i=><Item key={i.href} item={i}/>)}</div></div>
        <div><p className="text-[10px] text-zinc-500 px-4 mb-2 tracking-widest">{!collapsed && 'SYSTEM'}</p><div className="space-y-1">{sys.map(i=><Item key={i.href} item={i}/>)}</div></div>
      </div>

      <div className="text-[10px] text-zinc-600 p-2 mt-auto">
        {!collapsed && 'RO5: 069107032F4002485 • MQTT: broker.emqx.io:1883'}
      </div>
    </div>
  )
}
