import React from 'react'

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 AAI Data Import System</h1>
      <p>✅ React is working!</p>
      <p>✅ Vite build successful!</p>
      <p>✅ Deployment successful!</p>
      <div style={{ 
        background: '#f0f9ff', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>System Status</h2>
        <p>🟢 Frontend: Online</p>
        <p>🟡 Backend: Connecting...</p>
        <p>📊 Ready for data import</p>
      </div>
    </div>
  )
}

export default TestApp