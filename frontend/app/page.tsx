"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

// Absolute targeting variable fallback matching your hosting instance configuration
const BACKEND ="https://onrender.com"

// Explicit type layout definition synchronized to our backend output structures
type Health = {
  status: string
  backend?: string
  message?: string
  mqtt?: string
  device?: string
  uptime?: string | number
  lastMqttInteraction?: string
}

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null)
  const [backendUp, setBackendUp] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Querying the root health configuration endpoint exposed by your server configuration
        const res = await fetch(`${BACKEND}/`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
          // Evaluate state dynamically; validates status string outputs directly 
          setBackendUp(data.status === "online")
        } else {
          setBackendUp(false)
        }
      } catch (e) {
        setBackendUp(false)
      } finally {
        setLoading(false)
      }
    }
    
    // Initial fetch validation execution sequence
    checkBackend()
    
    // Continuous monitoring lifecycle configuration loop (every 5 seconds)
    const interval = setInterval(checkBackend, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", fontFamily: "Arial, sans-serif" }}>
      {/* Top Banner Navigation Header */}
      <div style={{ background: "#0e7490", color: "white", padding: "20px 40px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>AquaSystem - Naivasha</h1>
        <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>CIP Cleaning & Water Monitoring System</p>
      </div>

      <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* Status Reporting Overview Cards Block Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          
          {/* Main API Infrastructure Monitor Panel */}
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: `5px solid ${backendUp ? "#16a34a" : "#dc2626"}` }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>BACKEND STATUS</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: backendUp ? "#16a34a" : "#dc2626" }}>
              {loading ? "Checking..." : backendUp ? "ONLINE" : "OFFLINE"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#888", overflowX: "auto" }}>{BACKEND}</p>
          </div>

          {/* MQTT Broker Communication Interface Verification */}
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: `5px solid ${backendUp && health?.mqtt ? "#16a34a" : "#ba8b02"}` }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>MQTT BROKER</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: backendUp && health?.mqtt ? "#16a34a" : "#ba8b02" }}>
              {loading ? "Checking..." : backendUp ? (health?.mqtt || "CONNECTED") : "DISCONNECTED"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#888" }}>Network Connection: WSS Secured</p>
          </div>

          {/* Connected Device Node Details */}
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "5px solid #7c3aed" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>SYSTEM TARGET</h3>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#7c3aed" }}>FRONTEND OK</p>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#666", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              Topic: {health?.device || "Checking..."}
            </p>
          </div>
        </div>

        {/* Action Link Management Panel Section */}
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

        {/* Live Payload Data Terminal Inspector Window */}
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginTop: 0 }}>Backend Response Payload</h3>
          <pre style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", overflow: "auto", fontSize: "13px", border: "1px solid #e2e8f0" }}>
            {health ? JSON.stringify(health, null, 2) : loading ? "Loading JSON..." : "Backend offline - verification system timed out"}
          </pre>
          {!backendUp && (
            <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "10px", fontWeight: "500" }}>
              Tip: If deployed on Render free tier, server spin up can require up to 60 seconds after periods of inactivity.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
