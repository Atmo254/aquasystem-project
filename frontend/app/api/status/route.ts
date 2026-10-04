import { NextResponse } from "next/server";

const BACKEND = "https://atmo-backend-212u.onrender.com/api/pumps/status";

export async function GET() {
  try {
    const r = await fetch(BACKEND, { cache: "no-store", next: { revalidate: 0 } });
    if (!r.ok) throw new Error("backend down");
    const data = await r.json();
    // Pass through EVERYTHING including allValues with exact RO5 names
    return NextResponse.json(data, { 
      headers: { "Cache-Control": "no-store" } 
    });
  } catch (e) {
    console.log("Backend error, returning last known structure with new names", e);
    return NextResponse.json({ 
      feedFlow: 0,
      permeateFlow: 0,
      concentrateFlow: 0,
      roPressure: 0,
      interstagePress: 0,
      concentratePress: 0,
      feedTankLevel: 0,
      systemRecovery: 0,
      pureWaterEc: 0,
      pump1: { status: "OFF", pressure: 0, flow: 0 }, // legacy compat
      pump2: { status: "OFF", pressure: 0, flow: 0 },
      tankLevel: 0,
      allValues: {},
      lastUpdate: new Date().toISOString(),
      error: "backend offline"
    });
  }
}
