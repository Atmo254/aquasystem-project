import { NextResponse } from "next/server";

const BACKEND = "https://atmo-backend-212u.onrender.com/api/pumps/status";

export async function GET() {
  try {
    const r = await fetch(BACKEND, { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ pump1: { status: "OFF", pressure: 0, flow: 0 }, pump2: { status: "OFF", pressure: 0, flow: 0 }, tankLevel: 0, lastUpdate: new Date().toISOString() });
  }
}
