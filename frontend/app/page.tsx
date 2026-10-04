"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("CONNECTING");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`/api/status`, { cache: "no-store" });
        const json = await r.json();
        setData(json);
        setStatus("ONLINE");
      } catch {
        setStatus("OFFLINE");
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const pump1 = data?.pump1 || { status: "OFF", pressure: 0, flow: 0 };
  const pump2 = data?.pump2 || { status: "OFF", pressure: 0, flow: 0 };
  const tank = data?.tankLevel || 0;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">ATMO Aqua System</h1>
            <p className="text-slate-400 text-sm mt-1">MQTT: 069107032F4002485/# • Live from Render</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${status === "ONLINE"? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
            <div className={`w-2 h-2 rounded-full ${status === "ONLINE"? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></div>
            BACKEND {status} • {data?.lastUpdate? new Date(data.lastUpdate).toLocaleTimeString() : "..."}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-slate-400 text-sm uppercase tracking-widest">Pump 1 - Main</h2>
              <span className={`text-xs px-2 py-1 rounded ${pump1.status === "Running"? "bg-emerald-500 text-black" : "bg-slate-700"}`}>{pump1.status}</span>
            </div>
            <div className="text-4xl font-bold mb-6">{pump1.flow} <span className="text-lg font-normal text-slate-400">L/min</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/50 rounded-xl p-3"><div className="text-xs text-slate-500">Pressure</div><div className="text-xl font-semibold">{pump1.pressure} bar</div></div>
              <div className="bg-black/50 rounded-xl p-3"><div className="text-xs text-slate-500">Flow</div><div className="text-xl font-semibold">{pump1.flow} L/m</div></div>
            </div>
            <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, Number(pump1.flow) / 5)}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-slate-400 text-sm uppercase tracking-widest">Pump 2 - Backup</h2>
              <span className={`text-xs px-2 py-1 rounded ${pump2.status === "Running"? "bg-emerald-500 text-black" : "bg-slate-700"}`}>{pump2.status}</span>
            </div>
            <div className="text-4xl font-bold mb-6">{pump2.flow || 0} <span className="text-lg font-normal text-slate-400">L/min</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/50 rounded-xl p-3"><div className="text-xs text-slate-500">Pressure</div><div className="text-xl font-semibold">{pump2.pressure || 0} bar</div></div>
              <div className="bg-black/50 rounded-xl p-3"><div className="text-xs text-slate-500">Status</div><div className="text-xl font-semibold">{pump2.status}</div></div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-400 text-sm uppercase tracking-widest mb-4">Tank Level</h2>
            <div className="flex items-end gap-6">
              <div className="text-5xl font-black">{tank}%</div>
              <div className="flex-1 h-32 bg-black/50 rounded-xl relative overflow-hidden border border-slate-800">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-cyan-300 transition-all duration-1000" style={{ height: `${tank}%` }}></div>
              </div>
            </div>
            <div className="mt-6 text-xs text-slate-500">Device ID: 069107032F4002485<br/>Broker: broker.emqx.io:8084 (WSS)</div>
          </div>
        </div>

        <div className="mt-8 bg-black/60 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-2">LIVE JSON /api/status</div>
          <pre className="text-[11px] text-emerald-300 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
