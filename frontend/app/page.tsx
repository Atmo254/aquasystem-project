/** @type {import('next').NextConfig} */
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://atmo-backend-212u.onrender.com";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

Then in your component, fetch from `/api/backend/` instead of the raw backend URL. The browser now makes a same-origin request → **no CORS**. (This only works in a Next.js server environment, not a static export.)

### Rewritten `app/page.tsx` (or `pages/index.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Health = {
  status: string;
  backend?: string;
  message?: string;
  mqtt?: string;
  device?: string;
  uptime?: string | number;
  lastMqttInteraction?: string;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://atmo-backend-212u.onrender.com";
// Routed through Next.js rewrites so the browser call is same-origin (no CORS).
const PROXY = "/api/backend/";

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [backendUp, setBackendUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${PROXY}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Health = await res.json();
        setHealth(data);
        setBackendUp(data.status === "online");
        setError(null);
      } catch (e) {
        setBackendUp(false);
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const card = (border: string) => ({
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    borderLeft: `5px solid ${border}`,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "#0e7490", color: "white", padding: "20px 40px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>AquaSystem - Naivasha</h1>
        <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>CIP Cleaning & Water Monitoring System</p>
      </div>

      <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
        {/* Status cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div style={card(backendUp ? "#16a34a" : "#dc2626")}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>BACKEND STATUS</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: backendUp ? "#16a34a" : "#dc2626" }}>
              {loading ? "Checking..." : backendUp ? "ONLINE" : "OFFLINE"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#888", overflowX: "auto" }}>{BACKEND}</p>
          </div>

          <div style={card(backendUp && health?.mqtt ? "#16a34a" : "#ba8b02")}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>MQTT BROKER</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: backendUp && health?.mqtt ? "#16a34a" : "#ba8b02" }}>
              {loading ? "Checking..." : backendUp ? health?.mqtt || "CONNECTED" : "DISCONNECTED"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#888" }}>Network Connection: WSS Secured</p>
          </div>

          <div style={card("#7c3aed")}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>SYSTEM TARGET</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#7c3aed" }}>FRONTEND OK</p>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#666", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              Topic: {health?.device || "Checking..."}
            </p>
          </div>
        </div>

        {/* Quick navigation */}
        <h2 style={{ marginBottom: "15px" }}>Quick Navigation</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          {[
            { href: "/executive", title: "Executive Dashboard", desc: "View KPIs, OEE, CIP efficiency, water usage reports" },
            { href: "/dashboard", title: "Operations Dashboard", desc: "Live sensors, alarms, CIP cycles, trends" },
            { href: "/trends", title: "Trends & History", desc: "Historical data, charts, export" },
            { href: "/login", title: "Login / Settings", desc: "User management, system configuration" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#0e7490" }}>{item.title}</h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Payload */}
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginTop: 0 }}>Backend Response Payload</h3>
          <pre style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", overflow: "auto", fontSize: "13px", border: "1px solid #e2e8f0" }}>
            {health ? JSON.stringify(health, null, 2) : loading ? "Loading JSON..." : "Backend offline - verification system timed out"}
          </pre>
          {!backendUp && (
            <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "10px", fontWeight: "500" }}>
              {error ? `Error: ${error}` : "Tip: If deployed on Render free tier, server spin up can require up to 60 seconds after periods of inactivity."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
