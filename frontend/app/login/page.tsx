"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function Login(){
  const r=useRouter();
  const [e,setE]=useState("admin@rvo.co.ke");
  const [p,setP]=useState("admin123");
  const login=()=>{
    const u={email:e,role:e.includes("admin")?"admin":e.includes("tech")?"technician":e.includes("client")?"client":"operator",name:e.split("@")[0],company:"RVO",allowedPages:["overview","tags","dosing","grids","maintenance","reports","users","alarms"]};
    localStorage.setItem("ro5_user",JSON.stringify(u));
    localStorage.setItem("ro5_user_full",JSON.stringify(u));
    r.push("/executive");
  };
  return <div style={{minHeight:"100vh",background:"#070a12",display:"grid",placeItems:"center"}}><div style={{background:"#0d111f",border:"1px solid #1e2d4a",padding:24,borderRadius:16,width:380}}><div style={{color:"white",fontWeight:800}}>RVO V10 CLEAN LOGIN</div><input value={e} onChange={x=>setE(x.target.value)} style={{width:"100%",marginTop:12,padding:10,background:"#070a12",border:"1px solid #1e2d4a",color:"white",borderRadius:8}}/><input value={p} onChange={x=>setP(x.target.value)} type="password" style={{width:"100%",marginTop:8,padding:10,background:"#070a12",border:"1px solid #1e2d4a",color:"white",borderRadius:8}}/><button onClick={login} style={{width:"100%",marginTop:12,padding:12,borderRadius:100,background:"white",color:"black",fontWeight:800,border:0}}>Login</button><div style={{marginTop:10,fontSize:10,opacity:0.4,color:"white"}}>admin@rvo.co.ke / admin123<br/>technician@rvo.co.ke / tech123<br/>Go to /login not /login%20...</div></div></div>
}
