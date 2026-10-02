"use client"
export default function Trends() {
  return (
    <div style={{padding:"20px", fontFamily:"Arial"}}>
      <h1>Trends & History</h1>
      <a href="/">Back Home</a>
      <div style={{background:"white", padding:"20px", marginTop:"20px", borderRadius:"10px"}}>
        <h3>Live Charts</h3>
        <p>Historical data - coming from backend MQTT</p>
        <div style={{height:"200px", background:"#f0f9ff", display:"flex", alignItems:"center", justifyContent:"center", marginTop:"10px"}}>
          Chart Placeholder - Connect to /api/trends
        </div>
      </div>
    </div>
  )
}