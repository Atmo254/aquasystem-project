export default function Home() {
  return (
    <div style={{padding: '40px', fontFamily: 'Arial'}}>
      <h1>AquaSystem - Naivasha</h1>
      <h2 style={{color: 'green'}}>✅ 404 FIXED! Homepage works!</h2>
      <p>Frontend running on https://atmo-backend-212u.onrender.com</p>
      <div style={{marginTop: '20px'}}>
        <a href="/executive"><button style={{padding: '10px', margin: '5px'}}>Executive Dashboard</button></a>
        <a href="/login"><button style={{padding: '10px', margin: '5px'}}>Login</button></a>
      </div>
    </div>
  )
}