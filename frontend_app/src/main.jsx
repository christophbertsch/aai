import React from 'react'
import ReactDOM from 'react-dom/client'

function SimpleTest() {
  return React.createElement('div', { 
    style: { 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh'
    } 
  }, [
    React.createElement('h1', { key: 'h1' }, '🚀 AAI System Test'),
    React.createElement('p', { key: 'p1' }, '✅ React is working!'),
    React.createElement('p', { key: 'p2' }, '✅ No CSS imports!'),
    React.createElement('p', { key: 'p3' }, '✅ Pure JavaScript!')
  ])
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(SimpleTest))
)