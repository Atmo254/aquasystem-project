"use client";
import { useEffect, useState } from "react";
const BACKEND_URL = "https://atmo-backend-212u.onrender.com";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("CONNECTING");
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/pumps/status`);
        setData(await r.json());
        setStatus("ONLINE");
      } catch { setStatus("OFFLINE"); }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">ATMO Aqua System - {status}</h1>
        <div className="bg-slate-900 p-4 rounded-xl">
          <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
        </div>
        <p className="mt-4 text-xs text-slate-400">MQTT: 069107032F4002485/# | Backend: {BACKEND_URL}</p>
      </div>
    </main>
  );
}
