"use client";
import { useEffect, useState } from "react";

const BACKEND_URL = "https://atmo-backend-212u.onrender.com";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("CONNECTING");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pumps/status`);
        const json = await res.json();
        setData(json);
        setStatus("ONLINE");
      } catch (e) {
        setStatus("OFFLINE");
        setData({ error: "Backend waking up, retrying..." });
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">ATMO Aqua System</h1>
          <div className={`px-3 py-1 rounded-full text-sm ${status === "ONLINE" ? "bg-green-500" : "bg-red-500"}`}>
            BACKEND STATUS {status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl">
            <h2 className="text-slate-400">Pump 1</h2>
            <p className="text-xl">{data?.pump1?.status || "Loading..."}</p>
            <p>Pressure: {data?.pump1?.pressure || 0} bar</p>
            <p>Flow: {data?.pump1?.flow || 0} L/min</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl">
            <h2 className="text-slate-400">Tank Level</h2>
            <p className="text-3xl">{data?.tankLevel || 0}%</p>
          </div>
        </div>

        <div className="mt-6 bg-black p-4 rounded-xl text-xs overflow-auto">
          <p className="text-slate-400 mb-2">MQTT Topic: 069107032F4002485/# | Last Update: {data?.lastUpdate}</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <p className="mt-2 text-green-400">Backend: {BACKEND_URL}</p>
        </div>
      </div>
    </main>
  );
}
