"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import mqtt from "mqtt";

type Threshold = { low?:number; high?:number };
type WidgetDef = { id:string; label:string; key:string; unit:string; icon:string; color:string; max:number; enabled:boolean; topic?:string; tagId?:string; tankId?:string; threshold?:Threshold; isPressure?:boolean; };
type Alarm = { id:number; time:string; asset:string; tag:string; value:string; severity:string; ack:boolean; source?:string; };
type Tag = { id:string; name:string; type:"float"|"bit"; topic:string; unit:string; value:number; min?:number; max?:number; isAlarmTag?:boolean; alarmOn?:number; description?:string; widgetKey?:string; lastUpdate?:string; bitLabelOff?:string; bitLabelOn?:string; };
type UserRec = { id:string; name:string; email:string; role:"admin"|"operator"|"viewer"; password:string; lastLogin?:string; active:boolean; allowedPages:string[]; };
type Dosing = { flow:number; doseRate:number; pumpSpeed:number; tankLevel:number; totalDosed:number; mode:"auto"|"manual"; };

const ALL_PAGES=[
  {id:"overview", label:"Overview", icon:"🏠"},
  {id:"tags", label:"Tags Mapping", icon:"🏷️"},
  {id:"dosing", label:"Antiscalant Dosing", icon:"🧪"},
  {id:"trends", label:"Live Charts", icon:"📈"},
  {id:"settings", label:"Pressure Alarms", icon:"⚙️"},
  {id:"grids", label:"Grid Manager", icon:"🧩"},
  {id:"ai", label:"AI Insights", icon:"🤖"},
  {id:"reports", label:"Reports PDF", icon:"📊"},
  {id:"users", label:"User Management", icon:"👥"},
  {id:"alarms", label:"Alarms Center", icon:"🔔"},
];

// CLEAN PRESSURE GAUGE - Only for Settings/Trends, NOT Overview
function TeslaMini({ value, max, color, threshold, unit }: { value:number; max:number; color:string; threshold?:Threshold; unit:string; }){
  const pct=Math.min(1, Math.max(0, (value||0)/(max||1)));
  const size=76; const cx=size/2; const cy=size/2+6; const r=size/2-14;
  let stateColor=color||"#38bdf8";
  if(threshold?.high!==undefined && value>threshold.high) stateColor="#ef4444";
  else if(threshold?.high!==undefined && value>threshold.high*0.8) stateColor="#f59e0b";
  const startA=-135; const endA=135; const range=endA-startA;
  const bg=`M ${cx+r*Math.cos(startA*Math.PI/180)} ${cy+r*Math.sin(startA*Math.PI/180)} A ${r} ${r} 0 1 1 ${cx+r*Math.cos(endA*Math.PI/180)} ${cy+r*Math.sin(endA*Math.PI/180)}`;
  const valA=startA+pct*range;
  const valPath=`M ${cx+r*Math.cos(startA*Math.PI/180)} ${cy+r*Math.sin(startA*Math.PI/180)} A ${r} ${r} 0 ${pct>0.5?1:0} 1 ${cx+r*Math.cos(valA*Math.PI/180)} ${cy+r*Math.sin(valA*Math.PI/180)}`;
  return (
    <div style={{width:size, height:size, position:"relative", flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow:"visible"}}>
        <path d={bg} fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round"/>
        <path d={valPath} fill="none" stroke={stateColor} strokeWidth="8" strokeLinecap="round" style={{transition:"0.8s"}}/>
        <circle cx={cx+r*Math.cos(valA*Math.PI/180)} cy={cy+r*Math.sin(valA*Math.PI/180)} r="4" fill={stateColor} stroke="white" strokeWidth="1.5"/>
      </svg>
      <div style={{position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-40%)", textAlign:"center"}}>
        <div style={{fontSize:13, fontWeight:900, color:"white"}}>{(value||0).toFixed(2)}</div>
        <div style={{fontSize:8, fontWeight:800, color:stateColor}}>{unit||""}</div>
      </div>
    </div>
  );
}

const DEFAULT_TAGS: Tag[] = [
  { id:"t_feed_flow", name:"Feed Flow", type:"float", topic:"plant/ro1/feed_flow", unit:"m³/h", value:0, min:0, max:15, widgetKey:"feed_flow" },
  { id:"t_prod_flow", name:"Product Flow", type:"float", topic:"plant/ro1/prod_flow", unit:"m³/h", value:0, min:0, max:10, widgetKey:"prod_flow" },
  { id:"t_reject_flow", name:"Reject Flow", type:"float", topic:"plant/ro1/reject_flow", unit:"m³/h", value:0, min:0, max:6, widgetKey:"reject_flow" },
  { id:"t_ec", name:"Product EC", type:"float", topic:"plant/ro1/ec_product", unit:"µS/cm", value:0, min:0, max:100, widgetKey:"ec_product" },
  { id:"t_media_dp", name:"Media Filter ΔP", type:"float", topic:"plant/filters/media_dp", unit:"bar", value:0, min:0, max:1.6, widgetKey:"media_dp" },
  { id:"t_cart_dp", name:"Cartridge ΔP", type:"float", topic:"plant/filters/cart_dp", unit:"bar", value:0, min:0, max:1.6, widgetKey:"cartridge_dp" },
  { id:"t_feed_p", name:"RO Feed Pressure", type:"float", topic:"plant/ro1/feed_pressure", unit:"bar", value:0, min:0, max:16, widgetKey:"feed_pressure" },
  { id:"t_stage1", name:"1st Stage ΔP", type:"float", topic:"plant/ro1/stage1_dp", unit:"bar", value:0, min:0, max:4, widgetKey:"stage1_dp" },
  { id:"t_stage2", name:"2nd Stage ΔP", type:"float", topic:"plant/ro1/stage2_dp", unit:"bar", value:0, min:0, max:4, widgetKey:"stage2_dp" },
  { id:"t_feed_level", name:"Feed Tank Level", type:"float", topic:"plant/tanks/feed_level", unit:"%", value:0, min:0, max:100, widgetKey:"feed_tank_level" },
  { id:"t_flush_level", name:"Flush Tank Level", type:"float", topic:"plant/tanks/flush_level", unit:"%", value:0, min:0, max:100, widgetKey:"flush_tank_level" },
  { id:"t_dosing_flow", name:"Dosing Flow Rate", type:"float", topic:"plant/dosing/flow", unit:"L/h", value:0, min:0, max:10, widgetKey:"dosing_flow" },
  { id:"t_dosing_tank", name:"Antiscalant Tank Level", type:"float", topic:"plant/dosing/tank_level", unit:"%", value:0, min:0, max:100, widgetKey:"dosing_tank" },
  // PUMPS - 0=OFF 1=RUNNING
  { id:"t_feed_pump", name:"Feed Pump", type:"bit", topic:"plant/pump/feed_run", unit:"", value:0, bitLabelOff:"OFF", bitLabelOn:"RUNNING", description:"Feed pump status" },
  { id:"t_hp_pump", name:"High Pressure Pump", type:"bit", topic:"plant/pump/hp_run", unit:"", value:0, bitLabelOff:"OFF", bitLabelOn:"RUNNING", description:"RO HP pump" },
  { id:"t_dosing_pump", name:"Dosing Pump", type:"bit", topic:"plant/pump/dosing_run", unit:"", value:0, bitLabelOff:"OFF", bitLabelOn:"RUNNING", description:"Antiscalant dosing pump" },
  { id:"t_flush_pump", name:"Flush Pump", type:"bit", topic:"plant/pump/flush_run", unit:"", value:0, bitLabelOff:"OFF", bitLabelOn:"RUNNING", description:"Flush pump" },
  // SYSTEM BITS - 0=OFF 1=RUNNING / ALARM
  { id:"t_system_auto", name:"System Auto Mode", type:"bit", topic:"plant/system/auto", unit:"", value:1, bitLabelOff:"MANUAL", bitLabelOn:"AUTO", description:"System mode" },
  { id:"t_system_run", name:"System Running", type:"bit", topic:"plant/system/running", unit:"", value:1, bitLabelOff:"STOPPED", bitLabelOn:"RUNNING", description:"Overall system status" },
  { id:"t_ro_running", name:"RO Running", type:"bit", topic:"plant/ro/running", unit:"", value:1, bitLabelOff:"OFF", bitLabelOn:"RUNNING" },
  // ALARM BITS
  { id:"t_high_pressure", name:"High Pressure Alarm", type:"bit", topic:"plant/alarms/high_pressure", unit:"", value:0, isAlarmTag:true, alarmOn:1, bitLabelOff:"OK", bitLabelOn:"ALARM" },
  { id:"t_media_fouled", name:"Media Fouled Alarm", type:"bit", topic:"plant/alarms/media_fouled", unit:"", value:0, isAlarmTag:true, alarmOn:1, bitLabelOff:"OK", bitLabelOn:"ALARM" },
  { id:"t_low_level", name:"Low Level Alarm", type:"bit", topic:"plant/alarms/low_level", unit:"", value:0, isAlarmTag:true, alarmOn:1, bitLabelOff:"OK", bitLabelOn:"ALARM" },
  { id:"t_dosing_fault", name:"Dosing Pump Fault", type:"bit", topic:"plant/dosing/fault", unit:"", value:0, isAlarmTag:true, alarmOn:1, bitLabelOff:"OK", bitLabelOn:"FAULT" },
];

const DEFAULT_WIDGETS: WidgetDef[] = [
  { id:"w_feed_flow", label:"Feed Flow", key:"feed_flow", unit:"m³/h", icon:"", color:"#22d3ee", max:15, enabled:true, topic:"plant/ro1/feed_flow", tagId:"t_feed_flow", threshold:{high:14} },
  { id:"w_prod_flow", label:"Product Flow", key:"prod_flow", unit:"m³/h", icon:"", color:"#3b82f6", max:10, enabled:true, topic:"plant/ro1/prod_flow", tagId:"t_prod_flow" },
  { id:"w_reject_flow", label:"Reject Flow", key:"reject_flow", unit:"m³/h", icon:"", color:"#ef4444", max:6, enabled:true, topic:"plant/ro1/reject_flow", tagId:"t_reject_flow" },
  { id:"w_ec", label:"Product Water EC", key:"ec_product", unit:"µS/cm", icon:"", color:"#fbbf24", max:100, enabled:true, topic:"plant/ro1/ec_product", tagId:"t_ec", threshold:{high:50} },
  { id:"w_daily", label:"Daily Production", key:"daily_prod", unit:"m³", icon:"", color:"#22c55e", max:100, enabled:true },
  { id:"w_weekly", label:"Weekly Production", key:"weekly_prod", unit:"m³", icon:"", color:"#a78bfa", max:500, enabled:true },
  { id:"w_monthly", label:"Monthly Production", key:"monthly_prod", unit:"m³", icon:"", color:"#f472b6", max:2000, enabled:true },
  { id:"w_media_dp", label:"Media Filter ΔP", key:"media_dp", unit:"bar", icon:"", color:"#fb923c", max:1.6, enabled:true, topic:"plant/filters/media_dp", tagId:"t_media_dp", threshold:{low:0, high:1.0}, isPressure:true },
  { id:"w_cart_dp", label:"Cartridge Filter ΔP", key:"cartridge_dp", unit:"bar", icon:"", color:"#a3e635", max:1.6, enabled:true, topic:"plant/filters/cart_dp", tagId:"t_cart_dp", threshold:{low:0, high:1.0}, isPressure:true },
  { id:"w_feed_p", label:"RO Feed Pressure", key:"feed_pressure", unit:"bar", icon:"", color:"#60a5fa", max:16, enabled:true, topic:"plant/ro1/feed_pressure", tagId:"t_feed_p", threshold:{low:6, high:14}, isPressure:true },
  { id:"w_stage1_dp", label:"1st Stage ΔP", key:"stage1_dp", unit:"bar", icon:"", color:"#34d399", max:4, enabled:true, topic:"plant/ro1/stage1_dp", tagId:"t_stage1", threshold:{low:0, high:2.5}, isPressure:true },
  { id:"w_stage2_dp", label:"2nd Stage ΔP", key:"stage2_dp", unit:"bar", icon:"", color:"#f87171", max:4, enabled:true, topic:"plant/ro1/stage2_dp", tagId:"t_stage2", threshold:{low:0, high:2.0}, isPressure:true },
  { id:"w_feed_tank", label:"Feed Tank Level", key:"feed_tank_level", unit:"%", icon:"", color:"#22d3ee", max:100, enabled:true, topic:"plant/tanks/feed_level", tagId:"t_feed_level", tankId:"feed", threshold:{low:20, high:95} },
  { id:"w_flush_tank", label:"Flush Tank Level", key:"flush_tank_level", unit:"%", icon:"", color:"#c084fc", max:100, enabled:true, topic:"plant/tanks/flush_level", tagId:"t_flush_level", tankId:"flush", threshold:{low:15, high:95} },
  { id:"w_dosing", label:"Antiscalant Dosing", key:"dosing_flow", unit:"L/h", icon:"", color:"#f59e0b", max:10, enabled:true, topic:"plant/dosing/flow", tagId:"t_dosing_flow" },
  { id:"w_dosing_tank", label:"Antiscalant Tank", key:"dosing_tank", unit:"%", icon:"", color:"#eab308", max:100, enabled:true, topic:"plant/dosing/tank_level", tagId:"t_dosing_tank", threshold:{low:15, high:95} },
  { id:"w_feed_pump", label:"Feed Pump", key:"feed_pump", unit:"", icon:"", color:"#22c55e", max:1, enabled:true, topic:"plant/pump/feed_run", tagId:"t_feed_pump" },
  { id:"w_hp_pump", label:"HP Pump", key:"hp_pump", unit:"", icon:"", color:"#3b82f6", max:1, enabled:true, topic:"plant/pump/hp_run", tagId:"t_hp_pump" },
  { id:"w_system", label:"System Status", key:"system_run", unit:"", icon:"", color:"#a78bfa", max:1, enabled:true, topic:"plant/system/running", tagId:"t_system_run" },
  { id:"w_core", label:"Core Status", key:"core_status", unit:"", icon:"", color:"#22c55e", max:1, enabled:true },
  { id:"w_recovery", label:"Recovery Rate", key:"recovery", unit:"%", icon:"", color:"#fbbf24", max:85, enabled:true, threshold:{low:30, high:80} },
];

function UltraChart({ data, color, max }: { data:number[]; color:string; max:number }){
  if(!data || data.length<3) return <div style={{height:50, opacity:0.2, fontSize:10, display:"grid", placeItems:"center"}}>● Live...</div>;
  const w=240; const h=56; const step=w/(data.length-1);
  let path=""; let fill="";
  data.forEach((v,i)=>{ const x=i*step; const y=h-(Math.min(v||0,max)/max)*h*0.75-6; if(i===0){ path="M "+x+" "+y; fill="M "+x+" "+h+" L "+x+" "+y; } else { path+=" L "+x+" "+y; fill+=" L "+x+" "+y; } });
  fill+=" L "+w+" "+h+" Z";
  const safeColor=color||"#38bdf8";
  return (<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}><defs><linearGradient id={`uc4-${safeColor.replace("#","")}-${Math.random()}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={safeColor} stopOpacity="0.5"/><stop offset="100%" stopColor={safeColor} stopOpacity="0"/></linearGradient></defs><path d={fill} fill={safeColor+"22"}/><path d={path} fill="none" stroke={safeColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx={(data.length-1)*step} cy={h-(Math.min(data[data.length-1]||0,max)/max)*h*0.75-6} r="4.5" fill={safeColor} stroke="white" strokeWidth="2"/></svg>);
}

function BitStatus({ tag, size="normal" }: { tag:Tag; size?: "small"|"normal"|"large"; }){
  const isOn=(tag.value||0)===1;
  const offLabel=tag.bitLabelOff||"OFF";
  const onLabel=tag.bitLabelOn||"RUNNING";
  const isAlarmTag=!!tag.isAlarmTag;
  const alarmActive=isAlarmTag && tag.value===(tag.alarmOn??1);
  const bg=isOn? (alarmActive? "#ef4444": "#22c55e") : "#1e293b";
  const color=isOn? "white" : "#64748b";
  const label=isOn? onLabel : offLabel;
  const isSmall=size==="small";
  return (
    <div style={{display:"flex", alignItems:"center", gap:isSmall?4:8}}>
      <div style={{width:isSmall?32:44, height:isSmall?22:28, background:"#020617", borderRadius:99, position:"relative", border:`1px solid ${isOn? bg+"88":"#ffffff15"}`, transition:"0.3s"}}>
        <div style={{position:"absolute", top:2, left:isOn? (isSmall?12:18):2, width:isSmall?16:22, height:isSmall?16:22, borderRadius:99, background:bg, transition:"0.3s", boxShadow: isOn? `0 0 10px ${bg}88`:"none"}}/>
      </div>
      <div style={{display:"flex", flexDirection:"column"}}>
        <span style={{fontSize:isSmall?9:11, fontWeight:800, color: alarmActive? "#ef4444": isOn? "#22c55e":"#64748b", background: isOn? (alarmActive? "#ef444422":"#22c55e22"):"#ffffff08", padding:isSmall?"2px 6px":"3px 8px", borderRadius:99, border:`1px solid ${isOn? (alarmActive? "#ef444444":"#22c55e44"):"#ffffff10"}`}}>{label}</span>
        {!isSmall && <span style={{fontSize:8, opacity:0.4, marginTop:2}}>{isOn? "1":"0"} • {tag.topic.split("/").pop()}</span>}
      </div>
    </div>
  );
}

export default function V16UltraClean(){
  const router=useRouter();
  const [user,setUser]=useState<any>(null);
  const [currentUserRec,setCurrentUserRec]=useState<UserRec|null>(null);
  const [nav,setNav]=useState("overview");
  const [live,setLive]=useState<Record<string,number>>({});
  const [history,setHistory]=useState<Record<string,number[]>>({});
  const [widgets,setWidgets]=useState<WidgetDef[]>(DEFAULT_WIDGETS);
  const [tags,setTags]=useState<Tag[]>(DEFAULT_TAGS);
  const [users,setUsers]=useState<UserRec[]>([
    { id:"u1", name:"Admin", email:"admin@rvo.co.ke", role:"admin", password:"admin123", active:true, lastLogin:"Today 10:20", allowedPages: ALL_PAGES.map(p=>p.id) },
    { id:"u2", name:"Client Operator", email:"client@rvo.co.ke", role:"operator", password:"op123", active:true, lastLogin:"Today 09:15", allowedPages:["overview","trends","dosing","alarms","reports"] },
    { id:"u3", name:"Viewer Client", email:"viewer@rvo.co.ke", role:"viewer", password:"view123", active:true, lastLogin:"Yesterday", allowedPages:["overview","trends","reports"] }
  ]);
  const [tanks]=useState([{ id:"feed", name:"Feed Tank", minM3:0.2, maxM3:10, heightM:2.5, shape:"cylindrical" },{ id:"flush", name:"Flush Tank", minM3:0.1, maxM3:3, heightM:1.8, shape:"rectangular" }]);
  const [mqttStatus,setMqttStatus]=useState("DISCONNECTED");
  const [broker,setBroker]=useState("wss://broker.hivemq.com:8884/mqtt");
  const [alarms,setAlarms]=useState<Alarm[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [showTagAdd,setShowTagAdd]=useState(false);
  const [showGridManager,setShowGridManager]=useState(false);
  const [showUserAdd,setShowUserAdd]=useState(false);
  const [editingUser,setEditingUser]=useState<UserRec|null>(null);
  const [newWidget,setNewWidget]=useState<Partial<WidgetDef>>({label:"New Sensor", key:"custom_1", unit:"bar", icon:"", color:"#38bdf8", max:10, enabled:true, topic:"plant/custom/value"});
  const [newTag,setNewTag]=useState<Partial<Tag>>({name:"New Tag", type:"float", topic:"plant/custom/tag", unit:"bar", min:0, max:10, isAlarmTag:false, alarmOn:1, bitLabelOff:"OFF", bitLabelOn:"RUNNING"});
  const [newUser,setNewUser]=useState<Partial<UserRec>>({name:"", email:"", role:"operator", password:"", active:true, allowedPages:["overview","trends","alarms"]});
  const [dosing,setDosing]=useState<Dosing>({ flow:8.5, doseRate:3.2, pumpSpeed:45, tankLevel:68, totalDosed:124.5, mode:"auto" });
  const [aiInsights,setAiInsights]=useState({ foulingRisk:"Medium", lsi:-0.2, nextMaintenance:"3 days", efficiency:87, prediction:"Media filter needs backwash in 12h" });
  const clientRef=useRef<any>(null);

  useEffect(()=>{
    const u=JSON.parse(localStorage.getItem("ro5_user")||"null");
    if(!u){ router.push("/login"); return; }
    setUser(u);
    try{
      const sW=JSON.parse(localStorage.getItem("rvo_widgets_v16")||localStorage.getItem("rvo_widgets_v15")||"null");
      if(sW && Array.isArray(sW)) setWidgets(sW.filter((w:any)=>w && w.id && w.key).map((w:any)=>({...w, icon:""})));
    }catch{}
    try{
      const sT=JSON.parse(localStorage.getItem("rvo_tags_v16")||localStorage.getItem("rvo_tags_v15")||"null");
      if(sT && Array.isArray(sT)) setTags(sT.filter((t:any)=>t && t.id).map((t:any)=>{
        if(t.type==="bit" &&!t.bitLabelOff){
          const isPump=t.topic.includes("pump")||t.name.toLowerCase().includes("pump");
          const isSystem=t.topic.includes("system")||t.name.toLowerCase().includes("system");
          return {...t, bitLabelOff: isPump? "OFF": isSystem? "STOPPED":"OK", bitLabelOn: isPump||isSystem? "RUNNING": t.isAlarmTag? "ALARM":"ON"};
        }
        return t;
      }));
    }catch{}
    try{
      const sU=JSON.parse(localStorage.getItem("rvo_users_v16")||localStorage.getItem("rvo_users_v15")||"null");
      if(sU && Array.isArray(sU)) setUsers(sU.filter((u:any)=>u && u.id));
    }catch{}
  },[]);
  useEffect(()=>{ if(users.length){ const cur=users.find(x=> x.email===user?.email || x.name===user?.name) || users[0]; setCurrentUserRec(cur); } },[users, user]);
  useEffect(()=>{ if(widgets.length) localStorage.setItem("rvo_widgets_v16", JSON.stringify(widgets)); },[widgets]);
  useEffect(()=>{ if(tags.length) localStorage.setItem("rvo_tags_v16", JSON.stringify(tags)); },[tags]);
  useEffect(()=>{ localStorage.setItem("rvo_users_v16", JSON.stringify(users)); },[users]);

  const triggerAlarm=(asset:string, tag:string, val:string, severity:string, source?:string)=>{
    if(!tag) return;
    const exists=alarms.find(a=> a.tag===tag &&!a.ack && Date.now()-a.id<20000);
    if(exists) return;
    setAlarms(prev=>[{id:Date.now(), time:new Date().toLocaleTimeString(), asset:asset||"PLANT", tag:tag||"Unknown", value:val||"", severity:severity||"WARNING", ack:false, source},...prev].slice(0,100));
  };

  useEffect(()=>{
    const iv=setInterval(()=>{
      const m:Record<string,number>={};
      m.feed_flow=8+Math.random()*4; m.prod_flow=5+Math.random()*2.5; m.reject_flow=m.feed_flow-m.prod_flow; m.ec_product=12+Math.random()*25;
      m.daily_prod=12+Math.sin(Date.now()/4000)*4+Math.random()*2; m.weekly_prod=85+Math.sin(Date.now()/6000)*12+Math.random()*4; m.monthly_prod=365+Math.sin(Date.now()/8000)*25+Math.random()*6;
      m.media_dp=0.4+Math.random()*1.1; m.cartridge_dp=0.3+Math.random()*0.9; m.feed_pressure=9+Math.random()*3.5; m.stage1_dp=1.1+Math.random()*1.1; m.stage2_dp=0.7+Math.random()*0.9;
      m.feed_tank_level=35+Math.random()*60; m.flush_tank_level=30+Math.random()*60; m.recovery=72+Math.random()*18; m.core_status=1;
      m.dosing_flow=2+Math.random()*2; m.dosing_tank=60+Math.sin(Date.now()/10000)*10+Math.random()*5;
      m.feed_pump=Math.random()>0.3?1:0; m.hp_pump=Math.random()>0.2?1:0; m.system_run=Math.random()>0.1?1:0;
      setDosing(prev=>({...prev, flow:m.feed_flow, doseRate: Number((m.feed_flow*0.4).toFixed(1)), pumpSpeed: Math.min(100, Math.max(20, m.feed_flow*5+20)), tankLevel:m.dosing_tank, totalDosed: prev.totalDosed+0.01 }));
      if(Math.random()>0.93){ const bts=tags.filter(t=>t && t.type==="bit" && t.isAlarmTag); if(bts.length){ const rt=bts[Math.floor(Math.random()*bts.length)]; if(rt){ triggerAlarm("DEVICE", rt.name||"Device Alarm", "BIT=1", "CRITICAL", "DEVICE BIT "+(rt.topic||"")); setTags(prev=>prev.map(t=> t.id===rt.id? {...t, value:1, lastUpdate:new Date().toLocaleTimeString()}: t)); setTimeout(()=>setTags(prev=>prev.map(t=> t.id===rt.id? {...t, value:0}: t)), 7000); } } }
      setLive(m);
      setHistory(prev=>{ const nh={...prev}; Object.keys(m).forEach(k=>{ const arr=nh[k]||[]; const up=[...arr, m[k]]; if(up.length>70) up.shift(); nh[k]=up; }); return nh; });
      widgets.filter(w=>w && w.key).forEach(w=>{ const val=m[w.key]; if(val===undefined) return; const th=w.threshold; if(!th) return; if(th.high!==undefined && val>th.high) triggerAlarm("THRESHOLD", w.label+" HIGH", val.toFixed(2)+" "+(w.unit||""), "WARNING", "Threshold"); if(th.low!==undefined && val<th.low) triggerAlarm("THRESHOLD", w.label+" LOW", val.toFixed(2)+" "+(w.unit||""), "WARNING", "Threshold"); });
      setTags(prev=>prev.filter(t=>t && t.id).map(t=>{
        if(t.widgetKey && m[t.widgetKey]!==undefined) return {...t, value:m[t.widgetKey], lastUpdate:new Date().toLocaleTimeString()};
        if(m[t.widgetKey||""]!==undefined) return {...t, value:m[t.widgetKey||""]};
        if(t.id==="t_feed_pump") return {...t, value:m.feed_pump, lastUpdate:new Date().toLocaleTimeString()};
        if(t.id==="t_hp_pump") return {...t, value:m.hp_pump, lastUpdate:new Date().toLocaleTimeString()};
        if(t.id==="t_system_run") return {...t, value:m.system_run, lastUpdate:new Date().toLocaleTimeString()};
        return t;
      }));
      if(Math.random()>0.7){ setAiInsights(prev=>({...prev, lsi: (Math.random()*1-0.5).toFixed(2) as any, efficiency: 80+Math.random()*15, foulingRisk: Math.random()>0.7? "High":Math.random()>0.4? "Medium":"Low" })); }
    },1000); return()=>clearInterval(iv);
  },[alarms, widgets, tags]);

  const connectMQTT=()=>{ try{ if(clientRef.current) clientRef.current.end(); setMqttStatus("CONNECTING..."); const c=mqtt.connect(broker); clientRef.current=c; c.on("connect",()=>{ setMqttStatus("CONNECTED 🟢"); c.subscribe("plant/#"); }); c.on("message",(topic, payload)=>{
    let vStr=payload.toString(); let vNum=parseFloat(vStr);
    try{ const j=JSON.parse(vStr); if(typeof j.value!=="undefined") { vNum=parseFloat(j.value); vStr=j.value.toString(); } }catch{}
    setTags(prev=>prev.filter(t=>t && t.id).map(t=>{ if(t.topic===topic){ const newVal=isNaN(vNum)? (vStr==="true"||vStr==="1"?1:0):vNum; if(t.type==="bit" && t.isAlarmTag && newVal=== (t.alarmOn??1)){ triggerAlarm("DEVICE", (t.name||"Device")+" ALARM", `BIT=${newVal}`, "CRITICAL", "MQTT BIT"); } return {...t, value:newVal, lastUpdate:new Date().toLocaleTimeString()}; } return t; }));
    const matchedTag=tags.find(t=>t && t.topic===topic); if(matchedTag && matchedTag.widgetKey){ setLive(p=>({...p, [matchedTag.widgetKey!]: isNaN(vNum)?0:vNum})); }
    const w=widgets.find(x=>x && x.topic===topic); if(w &&!isNaN(vNum)){ setLive(p=>({...p, [w.key]:vNum})); }
  }); }catch{ setMqttStatus("FAILED"); } };

  const isAlarm=(w:any, val:number)=>{
    if(!w || typeof w!=="object") return false;
    const th=w.threshold;
    if(!th || typeof th!=="object") return false;
    if(th.high!==undefined && typeof th.high==="number" && val>th.high) return true;
    if(th.low!==undefined && typeof th.low==="number" && val<th.low) return true;
    return false;
  };
  const removeWidget=(id:string)=>{ setWidgets(widgets.filter(w=>w && w.id!==id)); };
  const toggleWidget=(id:string)=>{ setWidgets(widgets.map(w=> w && w.id===id? {...w, enabled:!w.enabled}: w).filter(Boolean) as WidgetDef[]); };
  const addWidget=()=>{ if(!newWidget.label||!newWidget.key) return; setWidgets([...widgets, {...newWidget as WidgetDef, id:"w_"+Date.now(), isPressure:newWidget.unit==="bar"}]); setShowAdd(false); setNewWidget({label:"New Sensor", key:"custom_1", unit:"bar", icon:"", color:"#38bdf8", max:10, enabled:true, topic:"plant/custom/value"}); };
  const addTag=()=>{ if(!newTag.name||!newTag.topic) return; setTags([...tags, {...newTag as Tag, id:"t_"+Date.now(), value:0, lastUpdate:"never"}]); setShowTagAdd(false); };
  const removeTag=(id:string)=>{ setTags(tags.filter(t=>t && t.id!==id)); };
  const addUser=()=>{ if(!newUser.name||!newUser.email) return; setUsers([...users, {...newUser as UserRec, id:"u_"+Date.now(), lastLogin:"Never"} as UserRec]); setShowUserAdd(false); setNewUser({name:"", email:"", role:"operator", password:"", active:true, allowedPages:["overview","trends","alarms"]}); };
  const removeUser=(id:string)=>{ setUsers(users.filter(u=>u && u.id!==id)); };
  const updateThreshold=(id:string, field:"low"|"high", val:number)=>{ setWidgets(widgets.map(w=> w && w.id===id? {...w, threshold:{...w.threshold, [field]:val}}: w).filter(Boolean) as WidgetDef[]); };
  const getTankVolume=(tankId:string, percent:number)=>{ const tank=tanks.find(t=>t.id===tankId); if(!tank) return 0; return tank.minM3+(percent/100)*(tank.maxM3-tank.minM3); };

  const downloadPDFReport=async()=>{
    const reportDate=new Date().toLocaleString();
    const htmlContent=`
      <html><head><meta charset="utf-8"><style>
        body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#0f172a;line-height:1.4}
        h1{color:#0f172a;margin:0;font-size:22px} h2{color:#1e293b;margin-top:24px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;font-size:16px}
        table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px} th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
        th{background:#0f172a;color:white;font-size:10px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:16px}
       .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.kpi div{background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:8px;text-align:center}
       .kpi b{font-size:16px;display:block;color:#0f172a}.badge{padding:2px 8px;border-radius:99px;font-size:9px;font-weight:800}
       .green{background:#dcfce7;color:#166534}.red{background:#fee2e2;color:#991b1b}.blue{background:#dbeafe;color:#1e40af}
       .footer{margin-top:30px;font-size:9px;color:#64748b;text-align:center;border-top:1px solid #e2e8f0;padding-top:10px}
      </style></head><body>
        <div class="header"><div><h1>RiftValley Osmotics - RO Plant Report</h1><div style="font-size:11px;color:#475569;margin-top:4px">Generated: ${reportDate} | User: ${user?.name||"Admin"} | Plant: Naivasha RO-1 | Report: Daily Production & System Status</div><div style="font-size:10px;margin-top:6px"><span class="badge green">MQTT: ${mqttStatus}</span> <span class="badge blue">${tags.filter(t=>t).length} Tags</span> <span class="badge ${alarms.filter(a=>a &&!a.ack).length>0?"red":"green"}">${alarms.filter(a=>a &&!a.ack).length} Active Alarms</span></div></div><div style="text-align:right"><div style="width:48px;height:48px;background:#0f172a;color:white;border-radius:10px;display:inline-grid;place-items:center;font-weight:900">RVO</div><div style="font-size:10px;margin-top:4px;font-weight:700">Executive SCADA<br/>V16 Clean</div></div></div>
        <div class="kpi">
          <div><b>${(live.daily_prod||0).toFixed(2)} m³</b><span style="font-size:10px">Daily Production</span><br/><span style="font-size:9px;color:#64748b">${(live.prod_flow||0).toFixed(2)} m³/h × 24h</span></div>
          <div><b>${(live.weekly_prod||0).toFixed(1)} m³</b><span style="font-size:10px">Weekly Production</span><br/><span style="font-size:9px;color:#64748b">Avg ${((live.weekly_prod||0)/7).toFixed(1)} m³/day</span></div>
          <div><b>${(live.monthly_prod||0).toFixed(1)} m³</b><span style="font-size:10px">Monthly Production</span><br/><span style="font-size:9px;color:#64748b">Avg ${((live.monthly_prod||0)/30).toFixed(1)} m³/day</span></div>
          <div><b>${aiInsights.efficiency.toFixed(1)}%</b><span style="font-size:10px">System Efficiency</span><br/><span style="font-size:9px;color:#64748b">Uptime ${(98.5+Math.random()).toFixed(2)}% | Recovery ${(live.recovery||0).toFixed(1)}%</span></div>
        </div>
        <h2>Live Sensor Values - Float Tags</h2>
        <table><tr><th>Tag Name</th><th>MQTT Topic</th><th>Value</th><th>Unit</th><th>Status</th><th>Last Update</th></tr>
          ${tags.filter(t=>t && t.type==="float").map(t=>{
            const widget=widgets.find(w=>w && w.tagId===t.id);
            const alarm=isAlarm(widget, t.value||0);
            return `<tr><td><b>${t.name||""}</b></td><td style="font-size:9px">${t.topic||""}</td><td><b>${(t.value||0).toFixed(2)}</b></td><td>${t.unit||""}</td><td><span class="badge ${alarm?"red":"green"}">${alarm?"ALARM":"NORMAL"}</span></td><td>${t.lastUpdate||""}</td></tr>`;
          }).join("")}
        </table>
        <h2>Pump & System Status - Bit Tags (0=OFF / 1=RUNNING)</h2>
        <table><tr><th>Equipment</th><th>Topic</th><th>Raw</th><th>Status</th><th>Type</th><th>Last Update</th></tr>
          ${tags.filter(t=>t && t.type==="bit").map(t=>{
            const isOn=(t.value||0)===1;
            const label=isOn? (t.bitLabelOn||"RUNNING") : (t.bitLabelOff||"OFF");
            const isAlarmActive=t.isAlarmTag && t.value===(t.alarmOn??1);
            return `<tr><td><b>${t.name||""}</b><br/><span style="font-size:9px;color:#64748b">${t.description||""}</span></td><td style="font-size:9px">${t.topic||""}</td><td>${t.value||0}</td><td><span class="badge ${isAlarmActive?"red": isOn?"green":"blue"}">${label}</span></td><td>${t.isAlarmTag?"ALARM TAG":"STATUS"}</td><td>${t.lastUpdate||""}</td></tr>`;
          }).join("")}
        </table>
        <h2>Active Alarms (${alarms.filter(a=>a).length} total, ${alarms.filter(a=>a &&!a.ack).length} unacked)</h2>
        <table><tr><th>Time</th><th>Asset</th><th>Tag</th><th>Value</th><th>Severity</th><th>Source</th><th>Ack</th></tr>
          ${alarms.filter(a=>a).slice(0,30).map(a=>`<tr><td>${a.time||""}</td><td>${a.asset||""}</td><td>${a.tag||""}</td><td>${a.value||""}</td><td><span class="badge ${a.severity==="CRITICAL"?"red":"blue"}">${a.severity||""}</span></td><td>${a.source||""}</td><td>${a.ack?"Yes":"No"}</td></tr>`).join("")}
          ${alarms.filter(a=>a).length===0? '<tr><td colspan="7" style="text-align:center;color:#22c55e">✅ No alarms - System Normal</td></tr>':""}
        </table>
        <h2>Antiscalant Dosing System</h2>
        <table><tr><th>Parameter</th><th>Value</th><th>Details</th></tr>
          <tr><td>Feed Flow</td><td>${dosing.flow.toFixed(2)} m³/h</td><td>Base for dosing calculation</td></tr>
          <tr><td>Dose Rate (Auto)</td><td>${dosing.doseRate} L/h</td><td>Flow × 0.4 ppm</td></tr>
          <tr><td>Pump Speed</td><td>${dosing.pumpSpeed.toFixed(0)}%</td><td>${dosing.mode.toUpperCase()} mode</td></tr>
          <tr><td>Tank Level</td><td>${dosing.tankLevel.toFixed(1)}% (${(dosing.tankLevel/100*200).toFixed(1)} L)</td><td>${dosing.tankLevel<15?"⚠️ LOW ALARM":"Normal"}</td></tr>
          <tr><td>Total Dosed Today</td><td>${dosing.totalDosed.toFixed(2)} L</td><td>Since midnight</td></tr>
        </table>
        <h2>AI Insights</h2>
        <table><tr><th>Metric</th><th>Value</th><th>AI Recommendation</th></tr>
          <tr><td>Fouling Risk</td><td><span class="badge ${aiInsights.foulingRisk==="High"?"red": aiInsights.foulingRisk==="Medium"?"blue":"green"}">${aiInsights.foulingRisk}</span></td><td>${aiInsights.prediction}</td></tr>
          <tr><td>LSI Index</td><td>${aiInsights.lsi}</td><td>${Number(aiInsights.lsi)>0.3?"Scaling risk - Increase antiscalant":Number(aiInsights.lsi)<-0.3?"Corrosion risk - Adjust pH":"Balanced - Optimal"}</td></tr>
          <tr><td>Efficiency</td><td>${aiInsights.efficiency.toFixed(1)}%</td><td>Next maintenance: ${aiInsights.nextMaintenance}</td></tr>
        </table>
        <div class="footer">Generated by RiftValley Osmotics SCADA V16 Ultra Clean • ${reportDate} • Plant: Naivasha RO-1 • MQTT: ${broker} • ${tags.filter(t=>t).length} Tags • ${widgets.filter(w=>w).length} Grids • Confidential<br/>This report includes analytics status bar, pump status 0=OFF 1=RUNNING, system bits, float sensors, alarms, dosing, AI insights</div>
      </body></html>
    `;
    // Try jsPDF first for true PDF download
    try{
      // @ts-ignore
      const jsPDFModule=await import("jspdf");
      const jsPDF=jsPDFModule.jsPDF || (jsPDFModule as any).default?.jsPDF || (jsPDFModule as any).jsPDF;
      if(jsPDF){
        const doc=new jsPDF({orientation:"landscape", unit:"mm", format:"a4"});
        // Simple text PDF - since html2pdf not available, create structured text PDF
        doc.setFontSize(16); doc.text("RiftValley Osmotics - RO Plant Report", 10, 15);
        doc.setFontSize(9); doc.text(`Generated: ${reportDate} | User: ${user?.name||"Admin"} | Plant: Naivasha | MQTT: ${mqttStatus}`, 10, 22);
        doc.setFontSize(11); doc.text(`Daily: ${(live.daily_prod||0).toFixed(2)} m³ | Weekly: ${(live.weekly_prod||0).toFixed(1)} m³ | Monthly: ${(live.monthly_prod||0).toFixed(1)} m³ | Eff: ${aiInsights.efficiency.toFixed(1)}% | Recovery: ${(live.recovery||0).toFixed(1)}% | Alarms: ${alarms.filter(a=>a &&!a.ack).length}`, 10, 30);
        let y=40;
        doc.setFontSize(10); doc.text("Float Tags:", 10, y); y+=6;
        tags.filter(t=>t && t.type==="float").forEach(t=>{
          if(y>180){ doc.addPage(); y=15; }
          const w=widgets.find(x=>x && x.tagId===t.id);
          const alarm=isAlarm(w, t.value||0)? "ALARM":"OK";
          doc.setFontSize(8); doc.text(`${t.name}: ${(t.value||0).toFixed(2)} ${t.unit||""} [${alarm}] - ${t.topic||""}`, 10, y); y+=5;
        });
        y+=4; doc.setFontSize(10); doc.text("Bit Tags - 0=OFF 1=RUNNING:", 10, y); y+=6;
        tags.filter(t=>t && t.type==="bit").forEach(t=>{
          if(y>180){ doc.addPage(); y=15; }
          const isOn=(t.value||0)===1; const label=isOn? (t.bitLabelOn||"RUNNING") : (t.bitLabelOff||"OFF");
          doc.setFontSize(8); doc.text(`${t.name}: ${t.value||0} = ${label} ${t.isAlarmTag? (t.value===(t.alarmOn??1)? "[ALARM ACTIVE]":"[ALARM TAG]"):"[STATUS]"} - ${t.topic||""}`, 10, y); y+=5;
        });
        y+=4; doc.text(`Dosing: Flow ${dosing.flow.toFixed(2)} m³/h | Rate ${dosing.doseRate} L/h | Tank ${dosing.tankLevel.toFixed(1)}% | Pump ${dosing.pumpSpeed.toFixed(0)}% | Total ${dosing.totalDosed.toFixed(2)} L | Mode ${dosing.mode}`, 10, y); y+=8;
        doc.text(`Alarms: ${alarms.filter(a=>a).length} total, ${alarms.filter(a=>a &&!a.ack).length} unacked`, 10, y); y+=6;
        alarms.filter(a=>a).slice(0,15).forEach(a=>{
          if(y>180){ doc.addPage(); y=15; }
          doc.setFontSize(7); doc.text(`${a.time||""} ${a.tag||""} ${a.value||""} ${a.severity||""} ${a.source||""} ${a.ack?"ACKED":"NEW"}`, 10, y); y+=4;
        });
        const fileName=`RVO_RO_Report_${new Date().toISOString().slice(0,10)}_${new Date().toTimeString().slice(0,8).replace(/:/g,"-")}.pdf`;
        doc.save(fileName);
        return;
      }
    }catch(e){
      console.log("jsPDF not available, falling back to print", e);
    }
    // Fallback - printable HTML that user saves as PDF
    const w=window.open("", "_blank");
    if(w){
      w.document.write(htmlContent);
      w.document.close();
      // Auto-trigger print dialog which allows Save as PDF
      setTimeout(()=>{ w.focus(); w.print(); }, 800);
    }
  };

  if(!user) return null;
  const allowedPages=currentUserRec?.allowedPages || ALL_PAGES.map(p=>p.id);
  const isAdmin=currentUserRec?.role==="admin";
  const Item=({k,l,i,c}:{k:string; l:string; i:string; c?:number})=>{
    const canView=allowedPages.includes(k) || isAdmin;
    if(!canView) return null;
    return <div onClick={()=>setNav(k)} style={{padding:"11px 14px", borderRadius:12, background:nav===k?"#ffffff14":"transparent", border: nav===k? "1px solid #ffffff15":"1px solid transparent", cursor:"pointer", display:"flex", gap:10, fontSize:13, fontWeight: nav===k?800:400}}><span>{i}</span>{l}{c!==undefined && c>0 && <span style={{marginLeft:"auto", background:"#ef4444", color:"white", fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:800}}>{c}</span>}</div>;
  };
  const activeWidgets=widgets.filter(w=>w && w.enabled); const unAck=alarms.filter(a=>a &&!a.ack).length; const bitAlarms=tags.filter(t=>t && t.type==="bit" && t.isAlarmTag && t.value=== (t.alarmOn??1));
  const totalProd=live.daily_prod||0; const avgRecovery=live.recovery||0; const efficiency=aiInsights.efficiency; const uptime=98.5+Math.random()*1;
  const runningPumps=tags.filter(t=>t && t.type==="bit" &&!t.isAlarmTag && (t.value||0)===1).length;
  const totalPumps=tags.filter(t=>t && t.type==="bit" &&!t.isAlarmTag).length;

  return(
    <div style={{minHeight:"100vh", background:"#020617", color:"white", display:"flex", flexDirection:"column", fontFamily:"Inter, system-ui"}}>
      <div style={{height:58, background:"linear-gradient(90deg,#0f172a,#1e293b)", borderBottom:"1px solid #ffffff10", display:"flex", alignItems:"center", padding:"0 18px", gap:18, overflowX:"auto", boxShadow:"0 2px 12px #0006", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:10, fontWeight:900, fontSize:14, flexShrink:0}}><div style={{width:32, height:32, background:"white", color:"black", borderRadius:8, display:"grid", placeItems:"center", fontSize:12}}>RVO</div>RVO SCADA V16</div>
        <div style={{width:1, height:24, background:"#ffffff15", flexShrink:0}}/>
        <div style={{display:"flex", gap:12, alignItems:"center", flex:1}}>
          <div style={{display:"flex", gap:6, alignItems:"center", background:"#ffffff08", padding:"4px 10px", borderRadius:99}}><span style={{width:8, height:8, borderRadius:99, background: mqttStatus.includes("CONNECTED")? "#22c55e":"#fbbf24"}}/><span style={{fontSize:11, fontWeight:800}}>{mqttStatus.includes("CONNECTED")? "MQTT OK":"MQTT OFF"}</span></div>
          <div style={{background:"#ffffff08", padding:"4px 10px", borderRadius:99, display:"flex", gap:8}}><span style={{fontSize:10, opacity:0.5}}>PROD</span><span style={{fontSize:12, fontWeight:800, color:"#22c55e"}}>{totalProd.toFixed(2)} m³</span><span style={{fontSize:10, opacity:0.5}}>| REC</span><span style={{fontSize:12, fontWeight:800}}>{avgRecovery.toFixed(1)}%</span></div>
          <div style={{background:"#22c55e15", border:"1px solid #22c55e33", padding:"4px 10px", borderRadius:99, display:"flex", gap:6, alignItems:"center"}}><span style={{fontSize:10, fontWeight:700, color:"#22c55e"}}>PUMPS: {runningPumps}/{totalPumps} RUNNING</span><span style={{fontSize:9, opacity:0.6}}>(0=OFF 1=RUNNING)</span></div>
          <div style={{background:"#a78bfa15", border:"1px solid #a78bfa33", padding:"4px 10px", borderRadius:99}}><span style={{fontSize:10, opacity:0.6}}>SYSTEM</span><span style={{fontSize:11, fontWeight:800, color: tags.find(t=>t.id==="t_system_run")?.value===1? "#22c55e":"#ef4444", marginLeft:6}}>{tags.find(t=>t.id==="t_system_run")?.value===1? "RUNNING":"STOPPED"} • {tags.find(t=>t.id==="t_system_auto")?.value===1? "AUTO":"MANUAL"}</span></div>
          <div style={{background: unAck>0? "#ef444422":"#22c55e22", border: unAck>0? "1px solid #ef444444":"1px solid #22c55e44", padding:"4px 10px", borderRadius:99}}><span style={{fontSize:10, fontWeight:800, color: unAck>0? "#fca5a5":"#86efac"}}>{unAck>0? `🚨 ${unAck} ALARMS`:"✅ Normal"} {bitAlarms.length>0 && `• ${bitAlarms.length} BIT ALARM`}</span></div>
          <div style={{background:"#f59e0b22", border:"1px solid #f59e0b44", padding:"4px 10px", borderRadius:99}}><span style={{fontSize:11, fontWeight:800, color:"#fbbf24"}}>DOSING {dosing.doseRate} L/h • {dosing.tankLevel.toFixed(0)}%</span></div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexShrink:0}}><div style={{fontSize:11, opacity:0.6}}>{currentUserRec?.name||user.name} • {currentUserRec?.role?.toUpperCase()}</div><div style={{width:28, height:28, background:"#1e293b", borderRadius:99, display:"grid", placeItems:"center", fontWeight:800, fontSize:12}}>{(currentUserRec?.name||user.name||"A")[0]}</div></div>
      </div>

      <div style={{display:"flex", flex:1, minHeight:0}}>
      <div style={{width:270, background:"#0f172a", padding:16, borderRight:"1px solid #ffffff10", display:"flex", flexDirection:"column", gap:6, overflowY:"auto"}}>
        <div style={{fontSize:10, opacity:0.4, marginTop:4, letterSpacing:1.2, fontWeight:700}}>NAVIGATION • {currentUserRec?.role?.toUpperCase()} • V16 CLEAN</div>
        {ALL_PAGES.map(p=><Item key={p.id} k={p.id} l={p.label} i={p.icon} c={p.id==="alarms"?unAck: p.id==="tags"?tags.length: p.id==="users"?users.length:undefined}/>)}
        <div style={{marginTop:14, padding:12, background:"#1e293b", borderRadius:14, border:"1px solid #ffffff10"}}><div style={{fontSize:10, opacity:0.5, fontWeight:700}}>MQTT STATUS</div><div style={{marginTop:6, fontSize:11, fontWeight:800, color: mqttStatus.includes("CONNECTED")? "#22c55e":"#fbbf24"}}>{mqttStatus}</div><div style={{fontSize:10, opacity:0.6, marginTop:4}}>{tags.filter(t=>t).length} tags • {activeWidgets.length}/{widgets.filter(w=>w).length} grids • Pumps {runningPumps}/{totalPumps} RUNNING</div><button onClick={connectMQTT} style={{marginTop:10, width:"100%", padding:"8px", borderRadius:10, background: mqttStatus.includes("CONNECTED")? "#22c55e":"#ffffff15", color: mqttStatus.includes("CONNECTED")? "black":"white", border:0, cursor:"pointer", fontSize:11, fontWeight:800}}>Connect MQTT</button></div>
        <button onClick={()=>{localStorage.removeItem("ro5_user"); router.push("/login");}} style={{marginTop:12, padding:10, borderRadius:10, background:"#1e293b", border:"1px solid #ffffff10", color:"white", cursor:"pointer", fontSize:12}}>Logout</button>
      </div>

      <div style={{flex:1, padding:18, overflow:"auto"}}>
        {nav==="overview" && (
          <>
            <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, alignItems:"center"}}>
              <div><h2 style={{margin:0, fontSize:22, fontWeight:900}}>Overview • ULTRA CLEAN • No Pressure Icons • Pumps 0=OFF 1=RUNNING</h2><div style={{fontSize:12, opacity:0.6, marginTop:4}}>All gauges removed from overview - clean MO style • Icons manual only • PDF download • Bit status OFF/RUNNING</div></div>
              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}><button onClick={()=>setShowGridManager(true)} style={{padding:"10px 16px", borderRadius:12, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>🧩 Grids ({activeWidgets.length}/{widgets.filter(w=>w).length})</button><button onClick={()=>setShowAdd(true)} style={{padding:"10px 16px", borderRadius:12, background:"#1e293b", border:"1px solid #38bdf8", color:"#7dd3fc", fontWeight:700, cursor:"pointer"}}>➕ Add Grid + Icon</button><button onClick={downloadPDFReport} style={{padding:"10px 16px", borderRadius:12, background:"#22c55e", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>📄 Download PDF</button></div>
            </div>
            {unAck>0 && <div style={{marginTop:14, background:"#ef444422", border:"1px solid #ef444488", padding:12, borderRadius:14, display:"flex", justifyContent:"space-between"}}><div style={{fontSize:13, fontWeight:800, color:"#fca5a5"}}>⚠️ {unAck} Alarms • {alarms.filter(a=>a &&!a.ack)[0]?.tag} {alarms.filter(a=>a &&!a.ack)[0]?.value}</div><button onClick={()=>setNav("alarms")} style={{padding:"7px 14px", borderRadius:10, background:"#ef4444", color:"white", border:0, cursor:"pointer", fontSize:12, fontWeight:800}}>View</button></div>}

            {/* PUMP & SYSTEM BITS STATUS ROW */}
            <div style={{marginTop:16, background:"linear-gradient(135deg,#0f172a,#020617)", padding:14, borderRadius:16, border:"1px solid #22c55e22"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><div style={{fontWeight:800, fontSize:13}}>⚙️ Pump & System Status • 0=OFF 1=RUNNING</div><div style={{fontSize:10, opacity:0.5}}>{runningPumps} of {totalPumps} pumps running • System {tags.find(t=>t.id==="t_system_run")?.value===1? "RUNNING":"STOPPED"}</div></div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10, marginTop:12}}>
                {tags.filter(t=>t && t.type==="bit" &&!t.isAlarmTag).map(t=><div key={t.id} style={{background:"#020617", padding:10, borderRadius:12, border:"1px solid #ffffff08", display:"flex", justifyContent:"space-between", alignItems:"center"}}><div><div style={{fontSize:11, fontWeight:800}}>{t.name}</div><div style={{fontSize:9, opacity:0.5}}>{t.topic}</div></div><BitStatus tag={t} size="normal"/></div>)}
              </div>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:14, marginTop:14}}>
              {activeWidgets.map(w=>{
                if(!w ||!w.id) return null;
                const val=live[w.key]||0; const alarm=isAlarm(w,val); const hist=history[w.key]||[]; const tank=tanks.find(t=>t.id===w.tankId); const linkedTag=tags.find(t=>t && t.id===w.tagId);
                const isBitWidget=linkedTag?.type==="bit";
                const hasIcon=w.icon && w.icon.trim().length>0;
                return(
                  <div key={w.id} style={{background: alarm? "linear-gradient(135deg,#3f1a1a,#1f0f0f)":"linear-gradient(135deg,#0f172a,#0b1220)", padding:16, borderRadius:20, border: alarm? "1.5px solid #ef4444":"1px solid #ffffff10", position:"relative", boxShadow: alarm? "0 0 28px #ef444444":"0 10px 28px #0007"}}>
                    <div style={{position:"absolute", top:0, left:0, right:0, height:2, background: alarm? "#ef4444":`linear-gradient(90deg,${w.color||"#38bdf8"},transparent)`, borderRadius:"20px 20px 0 0"}}/>
                    <button onClick={()=>removeWidget(w.id)} style={{position:"absolute", top:10, right:10, width:24, height:24, borderRadius:99, background:"#000a", color:"#94a3b8", border:"1px solid #ffffff15", fontSize:12, cursor:"pointer", zIndex:2}}>✕</button>
                    {/* ULTRA CLEAN HEADER - NO GAUGE */}
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                      <div style={{display:"flex", gap:12, alignItems:"center", flex:1, minWidth:0}}>
                        {hasIcon? <div style={{width:48, height:48, background:`${w.color||"#38bdf8"}18`, border:`1px solid ${w.color||"#38bdf8"}33`, borderRadius:14, display:"grid", placeItems:"center", fontSize:22, flexShrink:0}}>{w.icon}</div> : <div style={{width:48, height:48, background:`linear-gradient(135deg,${w.color||"#38bdf8"}18,#ffffff05)`, border:`1px solid ${w.color||"#38bdf8"}22`, borderRadius:14, display:"grid", placeItems:"center", fontSize:13, fontWeight:900, color:w.color||"#38bdf8", flexShrink:0}}>{(w.label||"??").slice(0,2).toUpperCase()}</div>}
                        <div style={{flex:1, minWidth:0}}><div style={{fontSize:11, opacity:0.5, letterSpacing:0.8, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{w.label||"Unknown"}</div>
                          {isBitWidget && linkedTag? <div style={{marginTop:4}}><BitStatus tag={linkedTag} size="small"/></div> : <div style={{display:"flex", alignItems:"baseline", gap:6, marginTop:2}}><div style={{fontSize:22, fontWeight:900, color: alarm? "#fca5a5":"white"}}>{(val||0).toFixed(2)}</div><div style={{fontSize:12, opacity:0.6, fontWeight:600}}>{w.unit||""}</div></div>}
                          <div style={{fontSize:9, opacity:0.4, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>Tag: {linkedTag? `${linkedTag.name} [${linkedTag.type}]`:"Clean - no icon"} • {(w.topic||"SIM").slice(0,26)}</div>
                        </div>
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end", marginRight:28, flexShrink:0}}>{alarm && <span style={{fontSize:8, padding:"3px 8px", background:"#ef4444", color:"white", borderRadius:99, fontWeight:800}}>ALARM</span>}<span style={{fontSize:8, padding:"3px 8px", background: linkedTag? (linkedTag.type==="bit"? (linkedTag.value===1? "#22c55e22":"#1e293b"):"#22c55e22"):"#38bdf822", color: linkedTag? (linkedTag.type==="bit"? (linkedTag.value===1? "#22c55e":"#64748b"):"#22c55e"):"#38bdf8", borderRadius:99, fontWeight:700, border:`1px solid ${linkedTag? (linkedTag.type==="bit"? (linkedTag.value===1? "#22c55e44":"#ffffff15"):"#22c55e44"):"#38bdf844"}`}}>{linkedTag? (linkedTag.type==="bit"? `${linkedTag.value===1? (linkedTag.bitLabelOn||"RUNNING"):(linkedTag.bitLabelOff||"OFF")}`:linkedTag.type.toUpperCase()): "LIVE"}</span></div>
                    </div>
                    {w.tankId && tank? (<div style={{marginTop:12, display:"flex", gap:10, alignItems:"center", background:"#020617", padding:10, borderRadius:12}}><div style={{width:38, height:52, background:"#1e293b", borderRadius:10, position:"relative", overflow:"hidden", flexShrink:0}}><div style={{position:"absolute", bottom:0, width:"100%", height: val+"%", background:`linear-gradient(180deg,${w.color||"#38bdf8"},${w.color||"#38bdf8"}bb)`, transition:"0.8s"}}/></div><div><div style={{fontSize:12, fontWeight:800}}>{getTankVolume(w.tankId||"", val).toFixed(2)} m³ • {val.toFixed(1)}%</div><div style={{fontSize:10, opacity:0.5}}>Cal {tank.minM3}-{tank.maxM3} m³ • {tank.heightM}m {tank.shape}</div></div></div>) : (<div style={{marginTop:12}}><UltraChart data={hist} color={alarm? "#ef4444":w.color||"#38bdf8"} max={w.max||100}/><div style={{marginTop:8, display:"flex", justifyContent:"space-between"}}><div style={{fontSize:9, opacity:0.5}}>Range {w.threshold?.low!==undefined? w.threshold.low+"→":"0→"}{w.threshold?.high!==undefined? w.threshold.high:w.max||100} {w.unit||""} • {alarm? "ALARM":"Normal"} • {hist.length} pts • {linkedTag?.lastUpdate||"live"}</div><div style={{fontSize:9, opacity:0.3}}>{isBitWidget? "" : `${val.toFixed(2)} ${w.unit||""}`}</div></div>{w.isPressure &&!isBitWidget && <div style={{marginTop:8, height:4, background:"#020617", borderRadius:99, display:"flex", overflow:"hidden"}}><div style={{width: ((w.threshold?.low||0)/(w.max||100)*100)+"%", background:"#020617"}}/><div style={{width: ((w.threshold?.high||w.max||100)/(w.max||100)*100 - (w.threshold?.low||0)/(w.max||100)*100)+"%", background:"#16a34a"}}/><div style={{flex:1, background:"#dc2626"}}/></div>}</div>)}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {nav==="reports" && (
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12}}><div><h2 style={{fontWeight:900, fontSize:22, margin:0}}>📊 Reports • PDF DOWNLOAD • Analytics</h2><div style={{fontSize:12, opacity:0.6, marginTop:4}}>True PDF download with jsPDF + printable fallback • Includes pump 0=OFF 1=RUNNING, system bits, analytics bar</div></div><div style={{display:"flex", gap:8}}><button onClick={downloadPDFReport} style={{padding:"12px 22px", borderRadius:12, background:"linear-gradient(90deg,#22c55e,#16a34a)", color:"black", fontWeight:900, border:0, cursor:"pointer", boxShadow:"0 4px 16px #22c55e44"}}>📥 Download PDF Report</button><button onClick={()=>{ const w=window.open("","_blank"); if(w){ w.document.write(`<pre>${JSON.stringify({live, tags:tags.filter(t=>t), alarms:alarms.filter(a=>a), dosing, aiInsights, reportDate:new Date().toLocaleString()}, null, 2)}</pre>`); w.document.close(); } }} style={{padding:"12px 16px", borderRadius:12, background:"#1e293b", border:"1px solid #ffffff15", color:"white", cursor:"pointer"}}>View JSON</button></div></div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:16}}>
              <div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>TODAY</div><div style={{fontSize:26, fontWeight:900}}>{live.daily_prod?.toFixed(2)} m³</div><div style={{fontSize:11, opacity:0.6}}>{live.prod_flow?.toFixed(2)} m³/h • Eff {aiInsights.efficiency.toFixed(0)}% • Pumps {runningPumps}/{totalPumps} RUN</div><div style={{marginTop:10}}><UltraChart data={history.daily_prod||[]} color="#22c55e" max={100}/></div></div>
              <div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>WEEKLY</div><div style={{fontSize:26, fontWeight:900}}>{live.weekly_prod?.toFixed(1)} m³</div><div style={{fontSize:11, opacity:0.6}}>Avg {((live.weekly_prod||0)/7).toFixed(1)} m³/day • System {tags.find(t=>t.id==="t_system_run")?.value===1? "RUNNING":"STOPPED"}</div><div style={{marginTop:10}}><UltraChart data={history.weekly_prod||[]} color="#a78bfa" max={500}/></div></div>
              <div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>MONTHLY</div><div style={{fontSize:26, fontWeight:900}}>{live.monthly_prod?.toFixed(1)} m³</div><div style={{fontSize:11, opacity:0.6}}>Avg {((live.monthly_prod||0)/30).toFixed(1)} m³/day • Recovery {(live.recovery||0).toFixed(1)}% • Dosing {dosing.doseRate} L/h</div><div style={{marginTop:10}}><UltraChart data={history.monthly_prod||[]} color="#f472b6" max={2000}/></div></div>
            </div>
            <div style={{marginTop:14, background:"#0f172a", padding:16, borderRadius:16, border:"1px solid #ffffff10"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><div style={{fontWeight:800}}>Pump & System Bits • 0=OFF 1=RUNNING • Included in PDF</div><div style={{fontSize:11, opacity:0.5}}>{runningPumps}/{totalPumps} pumps RUNNING • Bit alarms {bitAlarms.length}</div></div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:8, marginTop:12}}>
                {tags.filter(t=>t && t.type==="bit").map(t=><div key={t.id} style={{background:"#020617", padding:10, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center", border: (t.value||0)===1 && t.isAlarmTag? "1px solid #ef4444":"1px solid #ffffff08"}}><div><div style={{fontSize:11, fontWeight:700}}>{t.name}</div><div style={{fontSize:9, opacity:0.5}}>{t.topic} • {t.description||""}</div></div><BitStatus tag={t} size="normal"/></div>)}
              </div>
              <div style={{marginTop:16, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10}}>
                <div style={{background:"#020617", padding:12, borderRadius:12}}><div style={{fontSize:10, opacity:0.5}}>TOTAL TAGS</div><div style={{fontSize:20, fontWeight:800}}>{tags.filter(t=>t).length}</div><div style={{fontSize:10, opacity:0.5}}>{tags.filter(t=>t && t.type==="float").length} float • {tags.filter(t=>t && t.type==="bit").length} bit (0/1)</div></div>
                <div style={{background:"#020617", padding:12, borderRadius:12}}><div style={{fontSize:10, opacity:0.5}}>PUMPS RUNNING</div><div style={{fontSize:20, fontWeight:800, color:"#22c55e"}}>{runningPumps}/{totalPumps}</div><div style={{fontSize:10, opacity:0.5}}>0=OFF 1=RUNNING logic</div></div>
                <div style={{background:"#020617", padding:12, borderRadius:12}}><div style={{fontSize:10, opacity:0.5}}>ACTIVE ALARMS</div><div style={{fontSize:20, fontWeight:800, color: unAck>0? "#ef4444":"#22c55e"}}>{unAck}</div><div style={{fontSize:10, opacity:0.5}}>{alarms.filter(a=>a).length} total • {bitAlarms.length} device bit</div></div>
                <div style={{background:"#020617", padding:12, borderRadius:12}}><div style={{fontSize:10, opacity:0.5}}>DOSING & EFF</div><div style={{fontSize:20, fontWeight:800, color:"#f59e0b"}}>{dosing.doseRate} L/h</div><div style={{fontSize:10, opacity:0.5}}>Tank {dosing.tankLevel.toFixed(0)}% • Eff {efficiency.toFixed(0)}%</div></div>
              </div>
              <button onClick={downloadPDFReport} style={{width:"100%", marginTop:14, padding:14, borderRadius:12, background:"linear-gradient(90deg,#ffffff,#e2e8f0)", color:"black", fontWeight:900, border:0, cursor:"pointer", fontSize:14}}>📥 DOWNLOAD PDF REPORT • Includes Analytics Top Bar + Pumps 0=OFF 1=RUNNING + System Bits + Float Sensors + Alarms + Dosing + AI</button><div style={{fontSize:10, opacity:0.5, marginTop:6, textAlign:"center"}}>True PDF via jsPDF if installed, otherwise printable HTML → Save as PDF • File name: RVO_RO_Report_YYYY-MM-DD_HH-MM-SS.pdf</div>
            </div>
          </div>
        )}

        {nav==="tags" && <div><div style={{display:"flex", justifyContent:"space-between"}}><h2 style={{fontWeight:900, fontSize:22, margin:0}}>🏷️ Tags • Bit 0=OFF 1=RUNNING • Pumps & System</h2><div style={{display:"flex", gap:8}}><button onClick={()=>setShowTagAdd(true)} style={{padding:"10px 18px", borderRadius:12, background:"#fbbf24", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>➕ Add Tag (float/bit)</button></div></div>
          <div style={{marginTop:12, background:"#0f172a", padding:12, borderRadius:12, border:"1px solid #22c55e22"}}><div style={{fontWeight:700, fontSize:12}}>Pump & System Bits - 0=OFF 1=RUNNING Logic</div><div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:8, marginTop:10}}>{tags.filter(t=>t && t.type==="bit" &&!t.isAlarmTag).map(t=><div key={t.id} style={{background:"#020617", padding:10, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}><div><div style={{fontSize:11, fontWeight:700}}>{t.name}</div><div style={{fontSize:9, opacity:0.5}}>{t.topic}</div></div><BitStatus tag={t}/></div>)}</div></div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12}}><div style={{background:"#0f172a", padding:14, borderRadius:16}}><div style={{fontWeight:800}}>Float Tags — {tags.filter(t=>t && t.type==="float").length}</div><div style={{display:"grid", gap:8, marginTop:12, maxHeight:600, overflow:"auto"}}>{tags.filter(t=>t && t.type==="float").map(t=><div key={t.id} style={{background:"#020617", padding:10, borderRadius:12, display:"flex", gap:10, alignItems:"center"}}><div style={{width:44, height:44, background:"#1e293b", borderRadius:10, display:"grid", placeItems:"center", fontSize:11, fontWeight:800, color:"#7dd3fc"}}>{(t.value||0).toFixed(1)}<br/><span style={{fontSize:8, opacity:0.5}}>{t.unit||""}</span></div><div style={{flex:1}}><div style={{fontSize:12, fontWeight:800}}>{t.name||"Unnamed"}</div><div style={{fontSize:10, opacity:0.5}}>{t.topic||""}</div><input value={t.topic||""} onChange={e=>setTags(tags.map(x=> x && x.id===t.id? {...x, topic:e.target.value}: x).filter(Boolean) as Tag[])} style={{width:"100%", marginTop:4, padding:5, borderRadius:6, background:"#0f172a", border:"1px solid #ffffff15", color:"white", fontSize:10}}/></div><button onClick={()=>removeTag(t.id)} style={{padding:"6px 10px", borderRadius:8, background:"#ef444422", color:"#ef4444", border:0, cursor:"pointer", fontSize:10}}>Remove</button></div>)}</div></div><div style={{background:"#0f172a", padding:14, borderRadius:16}}><div style={{fontWeight:800}}>Bit Alarm Tags — {tags.filter(t=>t && t.type==="bit" && t.isAlarmTag).length}</div><div style={{display:"grid", gap:8, marginTop:12, maxHeight:600, overflow:"auto"}}>{tags.filter(t=>t && t.type==="bit" && t.isAlarmTag).map(t=><div key={t.id} style={{background: (t.value||0)===(t.alarmOn??1)? "#3f1a1a":"#020617", padding:10, borderRadius:12, display:"flex", gap:10, alignItems:"center"}}><div style={{width:44, height:44, background: t.value? "#ef444422":"#1e293b", borderRadius:10, display:"grid", placeItems:"center", fontSize:16, fontWeight:800, color: t.value? "#ef4444":"#64748b"}}>{t.value? "1":"0"}</div><div style={{flex:1}}><div style={{fontSize:12, fontWeight:800}}>{t.name||"Bit"} <span style={{fontSize:8, background: (t.value||0)===(t.alarmOn??1)? "#ef4444":"#ef444422", color: (t.value||0)===(t.alarmOn??1)? "white":"#ef4444", padding:"2px 5px", borderRadius:99}}>{(t.value||0)===(t.alarmOn??1)? (t.bitLabelOn||"ALARM"):(t.bitLabelOff||"OK")}</span></div><div style={{fontSize:10, opacity:0.5}}>{t.topic||""}</div><div style={{display:"flex", gap:6, marginTop:6}}><input value={t.topic||""} onChange={e=>setTags(tags.map(x=> x && x.id===t.id? {...x, topic:e.target.value}: x).filter(Boolean) as Tag[])} style={{flex:1, padding:5, borderRadius:6, background:"#0f172a", border:"1px solid #ffffff15", color:"white", fontSize:10}}/><button onClick={()=>setTags(tags.map(x=> x && x.id===t.id? {...x, value: x.value?0:1, lastUpdate:new Date().toLocaleTimeString()}: x).filter(Boolean) as Tag[])} style={{padding:"4px 8px", borderRadius:6, background:"#ffffff15", color:"white", border:0, cursor:"pointer", fontSize:9}}>Toggle 0/1</button></div></div><button onClick={()=>removeTag(t.id)} style={{padding:"6px 10px", borderRadius:8, background:"#ef444422", color:"#ef4444", border:0, cursor:"pointer", fontSize:10}}>Remove</button></div>)}</div></div></div></div>}

        {nav==="users" && <div><div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><div><h2 style={{fontWeight:900, fontSize:22, margin:0}}>👥 User Management • Page Assignment</h2></div><button onClick={()=>setShowUserAdd(true)} style={{padding:"12px 20px", borderRadius:12, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>➕ Add User + Pages</button></div><div style={{display:"grid", gap:12, marginTop:16}}>{users.filter(u=>u && u.id).map(u=>(<div key={u.id} style={{background:"#0f172a", padding:16, borderRadius:16, border:"1px solid #ffffff10"}}><div style={{display:"flex", alignItems:"center", gap:14}}><div style={{width:44, height:44, background: u.role==="admin"? "#ef444422":u.role==="operator"? "#22c55e22":"#64748b22", borderRadius:12, display:"grid", placeItems:"center", fontWeight:900, color: u.role==="admin"? "#ef4444":u.role==="operator"? "#22c55e":"#64748b"}}>{(u.name||"?")[0]}</div><div style={{flex:1}}><div style={{fontWeight:800, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>{u.name||"Unknown"} <span style={{fontSize:9, padding:"3px 8px", background: u.role==="admin"? "#ef4444":u.role==="operator"? "#22c55e":"#64748b", color:"white", borderRadius:99, fontWeight:800}}>{(u.role||"viewer").toUpperCase()}</span></div><div style={{fontSize:11, opacity:0.6}}>{u.email||""} • Pages: {(u.allowedPages||[]).join(", ")}</div></div><div style={{display:"flex", gap:6}}><button onClick={()=>{ setEditingUser(u); setNewUser(u); setShowUserAdd(true); }} style={{padding:"8px 12px", borderRadius:10, background:"#1e293b", color:"white", border:"1px solid #ffffff15", cursor:"pointer", fontSize:11}}>Edit Pages</button><button onClick={()=>removeUser(u.id)} style={{padding:"8px 12px", borderRadius:10, background:"#ef444422", color:"#ef4444", border:0, cursor:"pointer", fontSize:11}}>Remove</button></div></div></div>))}</div></div>}

        {nav==="dosing" && <div><h2 style={{fontWeight:900, fontSize:22, margin:0}}>🧪 Antiscalant Dosing • Pumps 0=OFF 1=RUNNING</h2><div style={{marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10}}>{tags.filter(t=>t && t.type==="bit" && (t.topic.includes("pump")||t.name.toLowerCase().includes("pump"))).map(t=><div key={t.id} style={{background:"#0f172a", padding:12, borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center"}}><div><div style={{fontSize:12, fontWeight:800}}>{t.name}</div><div style={{fontSize:10, opacity:0.5}}>{t.description||t.topic}</div></div><BitStatus tag={t}/></div>)}</div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginTop:16}}><div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>FEED FLOW</div><div style={{fontSize:28, fontWeight:900, marginTop:8}}>{dosing.flow.toFixed(2)} m³/h</div><div style={{marginTop:10}}><TeslaMini value={dosing.flow} max={15} color="#f59e0b" unit="m³/h" threshold={{low:0, high:14}}/></div></div><div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>DOSING RATE</div><div style={{fontSize:28, fontWeight:900, marginTop:8}}>{dosing.doseRate} L/h</div><div style={{marginTop:12, display:"flex", gap:8}}><button onClick={()=>setDosing({...dosing, mode:"auto"})} style={{flex:1, padding:8, borderRadius:8, background: dosing.mode==="auto"? "#f59e0b":"#1e293b", color: dosing.mode==="auto"? "black":"white", border:0, cursor:"pointer", fontSize:11, fontWeight:800}}>AUTO</button><button onClick={()=>setDosing({...dosing, mode:"manual"})} style={{flex:1, padding:8, borderRadius:8, background: dosing.mode==="manual"? "#f59e0b":"#1e293b", color: dosing.mode==="manual"? "black":"white", border:0, cursor:"pointer", fontSize:11, fontWeight:800}}>MANUAL</button></div></div><div style={{background:"#0f172a", padding:16, borderRadius:16}}><div style={{fontSize:11, opacity:0.5}}>TANK</div><div style={{fontSize:28, fontWeight:900, marginTop:8}}>{dosing.tankLevel.toFixed(1)}%</div><div style={{marginTop:10}}>{(dosing.tankLevel/100*200).toFixed(1)} L • Total {dosing.totalDosed.toFixed(1)} L</div></div></div></div>}

        {nav==="trends" && <div><h2 style={{fontWeight:900, fontSize:20}}>📈 Live Charts • Clean • No Pressure Overlap</h2><div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:12, marginTop:14}}>{activeWidgets.map(w=>{ if(!w ||!w.id) return null; const data=history[w.key]||[]; const val=live[w.key]||0; const linkedTag=tags.find(t=>t && t.id===w.tagId); const isBit=linkedTag?.type==="bit"; return <div key={w.id} style={{background:"#0f172a", padding:14, borderRadius:16, border:"1px solid #ffffff10"}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><div style={{fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:8}}>{w.icon? <span>{w.icon}</span>:<span style={{width:28, height:28, background:`${w.color||"#38bdf8"}22`, borderRadius:8, display:"grid", placeItems:"center", fontSize:10, fontWeight:800, color:w.color||"#38bdf8"}}>{(w.label||"??").slice(0,2)}</span>} {w.label||"Unknown"}</div><div style={{display:"flex", alignItems:"center", gap:8}}>{isBit && linkedTag? <BitStatus tag={linkedTag} size="small"/> : <span style={{fontWeight:800}}>{val.toFixed(2)} {w.unit||""}</span>}</div></div><div style={{marginTop:10}}><UltraChart data={data} color={w.color||"#38bdf8"} max={w.max||100}/></div></div>})}</div></div>}

        {nav==="settings" && <div><h2 style={{fontWeight:900, fontSize:20}}>⚙️ Pressure Alarms • Mini Gauges Only Here (not overview)</h2><div style={{display:"grid", gap:12, marginTop:14, maxWidth:1000}}>{widgets.filter(w=>w && w.isPressure).map(w=>{ if(!w ||!w.id) return null; const val=live[w.key]||0; const alarm=isAlarm(w,val); return (<div key={w.id} style={{background:"#0f172a", padding:16, borderRadius:16, border: alarm? "1.5px solid #ef4444":"1px solid #ffffff10", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}><TeslaMini value={val} max={w.max||1.6} color={w.color||"#38bdf8"} threshold={w.threshold} unit={w.unit||""}/><div style={{flex:1, minWidth:260}}><div style={{display:"flex", justifyContent:"space-between"}}><div style={{fontWeight:800}}>{w.label||"Pressure"} — {val.toFixed(2)} {w.unit||"bar"} {alarm? "🔴":"🟢"}</div><div style={{fontSize:11, padding:"4px 10px", background: alarm? "#ef4444":"#22c55e22", color: alarm? "white":"#22c55e", borderRadius:99, fontWeight:800}}>{alarm? `ALARM >${w.threshold?.high}`:"NORMAL"}</div></div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:12}}><div><div style={{fontSize:10, opacity:0.6}}>LOW</div><input type="number" step="0.1" value={w.threshold?.low??0} onChange={e=>updateThreshold(w.id,"low", Number(e.target.value))} style={{width:"100%", padding:10, borderRadius:10, background:"#020617", border:"1px solid #16a34a55", color:"white"}}/></div><div><div style={{fontSize:10, opacity:0.6, color:"#fbbf24"}}>HIGH</div><input type="number" step="0.1" value={w.threshold?.high??w.max*0.6} onChange={e=>updateThreshold(w.id,"high", Number(e.target.value))} style={{width:"100%", padding:10, borderRadius:10, background:"#020617", border:"2px solid #eab308", color:"white", fontWeight:800}}/></div><div><div style={{fontSize:10, opacity:0.6}}>Max</div><input type="number" step="0.1" value={w.max||1.6} onChange={e=>setWidgets(widgets.map(x=> x && x.id===w.id? {...x, max:Number(e.target.value)}: x).filter(Boolean) as WidgetDef[])} style={{width:"100%", padding:10, borderRadius:10, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/></div></div></div></div>)})}</div></div>}

        {nav==="grids" && <div><h2 style={{fontWeight:900, fontSize:20}}>🧩 Grid Manager • Clean No Pressure Gauges in Overview</h2><div style={{fontSize:11, opacity:0.6, marginTop:4}}>Overview now shows clean cards only - pressure mini gauges only in Settings/Trends/Dosing</div><div style={{marginTop:14, display:"flex", gap:8}}><button onClick={()=>setShowAdd(true)} style={{padding:"12px 20px", borderRadius:12, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>➕ Add Grid + Manual Icon</button><button onClick={()=>{ localStorage.removeItem("rvo_widgets_v16"); localStorage.removeItem("rvo_widgets_v15"); setWidgets(DEFAULT_WIDGETS); }} style={{padding:"12px 20px", borderRadius:12, background:"#1e293b", border:"1px solid #ffffff15", color:"white", cursor:"pointer"}}>Reset 21 Grids Clean (no pressure icons)</button></div><div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:10, marginTop:14}}>{widgets.filter(w=>w && w.id).map(w=><div key={w.id} style={{background:w.enabled? "#0f172a":"#020617", padding:12, borderRadius:14, border:"1px solid #ffffff10", opacity: w.enabled?1:0.5, display:"flex", gap:10, alignItems:"center"}}><input type="checkbox" checked={!!w.enabled} onChange={()=>toggleWidget(w.id)}/><div style={{flex:1}}><div style={{fontSize:12, fontWeight:800, display:"flex", gap:6, alignItems:"center"}}>{w.icon? <span>{w.icon}</span> : <span style={{width:20, height:20, background:`${w.color||"#38bdf8"}22`, borderRadius:6, display:"grid", placeItems:"center", fontSize:8, fontWeight:800, color:w.color||"#38bdf8"}}>{(w.label||"??").slice(0,2)}</span>} {w.label||"Unknown"} • {(live[w.key]||0).toFixed(2)} {w.unit||""} {w.icon? `(icon: ${w.icon})`:"(clean)"}</div><div style={{fontSize:10, opacity:0.5}}>{w.key||""} • Tag {w.tagId||"none"} • {w.topic||"SIM"}</div></div><button onClick={()=>removeWidget(w.id)} style={{padding:"8px 12px", borderRadius:10, background:"#ef4444", color:"white", border:0, cursor:"pointer", fontSize:11}}>Remove</button></div>)}</div></div>}

        {nav==="alarms" && <div><div style={{display:"flex", justifyContent:"space-between"}}><h2 style={{fontWeight:900, fontSize:20}}>Alarms — {alarms.filter(a=>a).length} ({unAck} new) • Pumps & System Bits</h2><div style={{display:"flex", gap:8}}><button onClick={()=>setAlarms([])} style={{padding:"10px 16px", borderRadius:10, background:"#1e293b", color:"white", border:"1px solid #ffffff15", cursor:"pointer"}}>Clear</button><button onClick={()=>setAlarms(alarms.filter(a=>a).map(a=>({...a, ack:true})))} style={{padding:"10px 16px", borderRadius:10, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>Ack All</button></div></div><div style={{marginTop:14, display:"grid", gap:8}}>{alarms.filter(a=>a).length===0 && <div style={{background:"#0f172a", padding:30, borderRadius:16, textAlign:"center", opacity:0.5}}>✅ No alarms • All pumps {runningPumps}/{totalPumps} RUNNING • System {tags.find(t=>t.id==="t_system_run")?.value===1? "RUNNING":"STOPPED"}</div>}{alarms.filter(a=>a).map(a=><div key={a.id} style={{background: a.ack? "#0f172a":"#3f1a1a", padding:12, borderRadius:12, borderLeft:`4px solid ${a.severity==="CRITICAL"? "#ef4444":"#fbbf24"}`, display:"flex", justifyContent:"space-between"}}><div><div style={{fontWeight:800, fontSize:13}}>{a.source? `[${a.source}]`:""} {a.tag||"Alarm"} — {a.value||""}</div><div style={{fontSize:11, opacity:0.6}}>{a.time||""} • {a.asset||""} • {a.severity||""}</div></div><button onClick={()=>setAlarms(alarms.filter(x=>x).map(x=> x.id===a.id? {...x, ack:true}: x))} style={{padding:"6px 14px", borderRadius:10, background: a.ack? "#1e293b":"white", color: a.ack? "white":"black", fontWeight:800, border:0, cursor:"pointer", fontSize:11}}>{a.ack? "Acked":"Ack"}</button></div>)}</div></div>}

        {showAdd && <div style={{position:"fixed", inset:0, background:"#000000aa", backdropFilter:"blur(12px)", display:"grid", placeItems:"center", zIndex:50, padding:16}}><div style={{background:"#1e293b", padding:20, borderRadius:20, width:500, border:"1px solid #ffffff15"}}><h3 style={{margin:0, fontWeight:900}}>➕ Add Grid + Manual Icon • Ultra Clean</h3><div style={{fontSize:11, opacity:0.6, marginTop:4}}>Leave icon empty for clean MO style. Add emoji manually: 🌊 💧 ⚙️ 🧪 etc. For pumps use 0=OFF 1=RUNNING bit tags.</div><div style={{display:"grid", gap:10, marginTop:14}}><input value={newWidget.label||""} onChange={e=>setNewWidget({...newWidget, label:e.target.value})} placeholder="Label e.g. Feed Pump" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><div style={{display:"flex", gap:8}}><input value={newWidget.key||""} onChange={e=>setNewWidget({...newWidget, key:e.target.value})} placeholder="Key e.g. feed_pump" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input value={newWidget.unit||""} onChange={e=>setNewWidget({...newWidget, unit:e.target.value})} placeholder="Unit (empty for bit)" style={{width:140, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/></div><div style={{display:"flex", gap:8}}><input value={newWidget.icon||""} onChange={e=>setNewWidget({...newWidget, icon:e.target.value})} placeholder="Icon MANUAL or empty for clean" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"2px solid #38bdf855", color:"white"}}/><input type="number" value={newWidget.max||10} onChange={e=>setNewWidget({...newWidget, max:Number(e.target.value)})} placeholder="Max" style={{width:100, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input type="color" value={newWidget.color||"#38bdf8"} onChange={e=>setNewWidget({...newWidget, color:e.target.value})} style={{width:60, height:44, borderRadius:12}}/></div><select value={newWidget.tagId||""} onChange={e=>{ const t=tags.find(x=>x && x.id===e.target.value); setNewWidget({...newWidget, tagId:e.target.value, topic:t?.topic||newWidget.topic}); }} style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #fbbf2444", color:"white"}}><option value="">Select Tag - choose bit for pump 0=OFF 1=RUNNING</option>{tags.filter(t=>t && t.id).map(t=><option key={t.id} value={t.id}>{t.name||"Tag"} [{t.type}] {t.topic||""} = {t.type==="bit"? `${t.value||0}=${(t.value||0)===1? (t.bitLabelOn||"RUNNING"):(t.bitLabelOff||"OFF")}`:`${(t.value||0).toFixed(2)} ${t.unit||""}`}</option>)}</select><input value={newWidget.topic||""} onChange={e=>setNewWidget({...newWidget, topic:e.target.value})} placeholder="MQTT topic" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #38bdf855", color:"white"}}/><div style={{display:"flex", gap:8}}><button onClick={()=>setShowAdd(false)} style={{flex:1, padding:12, borderRadius:12, background:"#020617", color:"white", border:"1px solid #ffffff15", cursor:"pointer"}}>Cancel</button><button onClick={addWidget} style={{flex:1, padding:12, borderRadius:12, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>Add Grid {newWidget.icon? `with ${newWidget.icon}`:"clean"}</button></div></div></div></div>}

        {showTagAdd && <div style={{position:"fixed", inset:0, background:"#000000aa", backdropFilter:"blur(12px)", display:"grid", placeItems:"center", zIndex:50, padding:16}}><div style={{background:"#1e293b", padding:20, borderRadius:20, width:540, border:"1px solid #ffffff15", maxHeight:"90vh", overflow:"auto"}}><h3 style={{margin:0, fontWeight:900}}>🏷️ Add Tag - Float or Bit 0=OFF 1=RUNNING</h3><div style={{display:"grid", gap:10, marginTop:14}}><input value={newTag.name||""} onChange={e=>setNewTag({...newTag, name:e.target.value})} placeholder="Tag name e.g. Feed Pump" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><div style={{display:"flex", gap:8}}><select value={newTag.type||"float"} onChange={e=>setNewTag({...newTag, type:e.target.value as any, bitLabelOff: e.target.value==="bit"? "OFF":undefined, bitLabelOn: e.target.value==="bit"? "RUNNING":undefined})} style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}><option value="float">Float — Sensor (bar, m³/h, %)</option><option value="bit">Bit — 0=OFF 1=RUNNING Pump/System</option></select><input value={newTag.unit||""} onChange={e=>setNewTag({...newTag, unit:e.target.value})} placeholder="Unit (empty for bit)" style={{width:120, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/></div><div style={{display:"flex", gap:8}}><input value={newTag.bitLabelOff||""} onChange={e=>setNewTag({...newTag, bitLabelOff:e.target.value})} placeholder="Label when 0 e.g. OFF / STOPPED / OK" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input value={newTag.bitLabelOn||""} onChange={e=>setNewTag({...newTag, bitLabelOn:e.target.value})} placeholder="Label when 1 e.g. RUNNING / AUTO / ALARM" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/></div><input value={newTag.topic||""} onChange={e=>setNewTag({...newTag, topic:e.target.value})} placeholder="MQTT Topic e.g. plant/pump/feed_run" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #fbbf2455", color:"white"}}/><div style={{display:"flex", gap:8}}><input type="number" value={newTag.min||0} onChange={e=>setNewTag({...newTag, min:Number(e.target.value)})} placeholder="Min 0" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input type="number" value={newTag.max||10} onChange={e=>setNewTag({...newTag, max:Number(e.target.value)})} placeholder="Max 1 for bit" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input value={newTag.widgetKey||""} onChange={e=>setNewTag({...newTag, widgetKey:e.target.value})} placeholder="Widget key" style={{flex:1, padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/></div><div style={{display:"flex", gap:12, alignItems:"center", background:"#020617", padding:10, borderRadius:10}}><label style={{display:"flex", alignItems:"center", gap:6, fontSize:12}}><input type="checkbox" checked={!!newTag.isAlarmTag} onChange={e=>setNewTag({...newTag, isAlarmTag:e.target.checked})}/>Is Alarm Tag?</label><select value={newTag.alarmOn||1} onChange={e=>setNewTag({...newTag, alarmOn:Number(e.target.value)})} style={{padding:4, borderRadius:6, background:"#1e293b", color:"white", border:"1px solid #ffffff15"}}><option value={1}>Alarm when 1</option><option value={0}>Alarm when 0</option></select><div style={{fontSize:10, opacity:0.5}}>For pumps: not alarm. For fault: alarm when 1</div></div><input value={newTag.description||""} onChange={e=>setNewTag({...newTag, description:e.target.value})} placeholder="Description e.g. Feed pump 0=OFF 1=RUNNING" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><div style={{display:"flex", gap:8}}><button onClick={()=>setShowTagAdd(false)} style={{flex:1, padding:12, borderRadius:12, background:"#020617", color:"white", border:"1px solid #ffffff15", cursor:"pointer"}}>Cancel</button><button onClick={addTag} style={{flex:1, padding:12, borderRadius:12, background:"#fbbf24", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>Add Tag {newTag.type==="bit"? `${newTag.bitLabelOff||"OFF"}/${newTag.bitLabelOn||"RUNNING"}`:""}</button></div></div></div></div>}

        {showUserAdd && <div style={{position:"fixed", inset:0, background:"#000000aa", backdropFilter:"blur(12px)", display:"grid", placeItems:"center", zIndex:50, padding:16}}><div style={{background:"#1e293b", padding:20, borderRadius:20, width:560, maxHeight:"90vh", overflow:"auto", border:"1px solid #ffffff15"}}><h3 style={{margin:0, fontWeight:900}}>👥 {editingUser? "Edit User Pages":"Add User + Assign Pages"}</h3><div style={{display:"grid", gap:10, marginTop:14}}><input value={newUser.name||""} onChange={e=>setNewUser({...newUser, name:e.target.value})} placeholder="Full Name" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input value={newUser.email||""} onChange={e=>setNewUser({...newUser, email:e.target.value})} placeholder="Email" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><input value={newUser.password||""} onChange={e=>setNewUser({...newUser, password:e.target.value})} placeholder="Password" type="password" style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}/><select value={newUser.role||"operator"} onChange={e=>setNewUser({...newUser, role:e.target.value as any})} style={{padding:12, borderRadius:12, background:"#020617", border:"1px solid #ffffff15", color:"white"}}><option value="admin">Admin — Full</option><option value="operator">Operator — Limited</option><option value="viewer">Viewer — Read only</option></select><div style={{background:"#020617", padding:12, borderRadius:12}}><div style={{fontWeight:800, fontSize:12}}>Assign Pages:</div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:10}}>{ALL_PAGES.map(p=>{ const checked=newUser.allowedPages?.includes(p.id); return <label key={p.id} style={{display:"flex", alignItems:"center", gap:8, background: checked? "#22c55e15":"#ffffff05", border: checked? "1px solid #22c55e33":"1px solid #ffffff10", padding:"8px 10px", borderRadius:10, cursor:"pointer"}}><input type="checkbox" checked={!!checked} onChange={e=>{ const pages=newUser.allowedPages||[]; if(e.target.checked){ setNewUser({...newUser, allowedPages:[...pages, p.id]}); } else { setNewUser({...newUser, allowedPages:pages.filter(x=>x!==p.id)}); } }} style={{width:16, height:16}}/><span style={{fontSize:12}}>{p.icon} {p.label}</span></label>})}</div></div><div style={{display:"flex", gap:8}}><button onClick={()=>{ setShowUserAdd(false); setEditingUser(null); setNewUser({name:"", email:"", role:"operator", password:"", active:true, allowedPages:["overview","trends","alarms"]}); }} style={{flex:1, padding:12, borderRadius:12, background:"#020617", color:"white", border:"1px solid #ffffff15", cursor:"pointer"}}>Cancel</button><button onClick={()=>{ if(editingUser){ setUsers(users.map(u=> u.id===editingUser.id? {...editingUser,...newUser} as UserRec : u).filter(Boolean) as UserRec[]); setEditingUser(null); } else { addUser(); } setShowUserAdd(false); }} style={{flex:1, padding:12, borderRadius:12, background:"white", color:"black", fontWeight:800, border:0, cursor:"pointer"}}>{editingUser? "Save Pages":"Add User"}</button></div></div></div></div>}
      </div>
      </div>
    </div>
  );
}
