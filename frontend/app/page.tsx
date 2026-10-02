"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const BACKEND =process.env.NEXT_PUBLIC_BACKEND_URL || "https://atmo-backend-212u.onrender.com"

type Health = {
  status: string
  uptime?: number
  database?: string
  version?: string
}

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null)
  const [backendUp, setBackendUp] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND}/health`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
          setBackendUp(true)
        } else {
          setBackendUp(false)
        }
      } catch (e) {
        setBackendUp(false)
      } finally {
        setLoading(false)
      }
    }
    checkBackend()
    const interval = setInterval(checkBackend, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0e7490", color: "white", padding: "20px 40px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>AquaSystem - Naivasha</h1>
        <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>CIP Cleaning & Water Monitoring System</p>
      </div>

      <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
        {/* Status Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: `5px solid ${backendUp ? "#16a34a" : "#dc2626"}` }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>BACKEND STATUS</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: backendUp ? "#16a34a" : "#dc2626" }}>
              {loading ? "Checking..." : backendUp ? "ONLINE" : "OFFLINE"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#888" }}>{BACKEND}</p>
          </div>

          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "5px solid #0e7490" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>DATABASE</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>{health?.database || "Checking..."}</p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#888" }}>Uptime: {health?.uptime ? Math.floor(health.uptime / 60) + " min" : "N/A"}</p>
          </div>

          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "5px solid #7c3aed" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>SYSTEM</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>FRONTEND OK</p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#16a34a", fontWeight: "bold" }}>404 FIXED - v0.1.0</p>
          </div>
        </div>

        {/* Main Navigation */}
        <h2 style={{ marginBottom: "15px" }}>Quick Navigation</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <Link href="/executive" style={{ textDecoration: "none" }}>
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#0e7490" }}>Executive Dashboard</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>View KPIs, OEE, CIP efficiency, water usage reports</p>
            </div>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#0e7490" }}>Operations Dashboard</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Live sensors, alarms, CIP cycles, trends</p>
            </div>
          </Link>
          <Link href="/trends" style={{ textDecoration: "none" }}>
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#0e7490" }}>Trends & History</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Historical data, charts, export</p>
            </div>
          </Link>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#0e7490" }}>Login / Settings</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>User management, system configuration</p>
            </div>
          </Link>
        </div>

        {/* Live Data */}
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginTop: 0 }}>Backend Response</h3>
          <pre style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", overflow: "auto", fontSize: "13px" }}>
            {health ? JSON.stringify(health, null, 2) : loading ? "Loading..." : "Backend offline - start backend on port 5000"}
          </pre>
          {!backendUp && (
            <p style={{ color: "#dc2626", fontSize: "14px" }}>
              Tip: In another terminal run: cd backend then npm start -- -H 0.0.0.0 -p 5000
            </p>
          )}
        </div>
      </div>
    </div>
  )
}