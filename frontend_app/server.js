const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const path = require('path')
const fs = require('fs-extra')
const { spawn } = require('child_process')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

// Store active import processes
let activeImports = new Map()

// API Routes - Proxy to Python backend
app.get('/api/collections', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5000/api/collections')
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/search', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/analytics', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5000/api/analytics')
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/discover_files', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5000/api/discover_files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('discover_files', async (data) => {
    try {
      // Mock file discovery - replace with actual file system scanning
      const mockFiles = [
        { path: '/data/TecDoc/brake_pads.7z', agent: 'TecDoc', size: 4200000 },
        { path: '/data/AutoCare/categories.txt', agent: 'AutoCare', size: 150000 },
        { path: '/data/MM/material_master.xml', agent: 'MM', size: 8300000 },
        { path: '/data/IA/interchange.csv', agent: 'IA', size: 12400000 },
        { path: '/data/Polk/vehicle_data.csv', agent: 'Polk', size: 100700000 }
      ]
      
      socket.emit('file_discovery', mockFiles)
    } catch (error) {
      socket.emit('import_log', { level: 'error', message: `File discovery error: ${error.message}` })
    }
  })

  socket.on('start_import', async (data) => {
    const { folderPath, collectionName } = data
    const importId = `import_${Date.now()}`
    
    try {
      socket.emit('import_status', 'running')
      socket.emit('import_log', { level: 'info', message: `Starting import for collection: ${collectionName}` })
      
      // Simulate import process
      const totalFiles = 50
      let filesProcessed = 0
      let recordsImported = 0
      
      const agents = ['TecDoc', 'AutoCare', 'MM', 'IA', 'Polk']
      
      const importInterval = setInterval(() => {
        if (filesProcessed >= totalFiles) {
          clearInterval(importInterval)
          socket.emit('import_status', 'completed')
          socket.emit('import_log', { level: 'success', message: `Import completed! ${recordsImported} records imported.` })
          activeImports.delete(importId)
          return
        }
        
        filesProcessed++
        const newRecords = Math.floor(Math.random() * 1000) + 100
        recordsImported += newRecords
        const currentAgent = agents[Math.floor(Math.random() * agents.length)]
        const currentFile = `file_${filesProcessed}.dat`
        
        socket.emit('import_progress', {
          currentFile,
          filesProcessed,
          totalFiles,
          recordsImported,
          currentAgent,
          overallProgress: Math.round((filesProcessed / totalFiles) * 100)
        })
        
        socket.emit('import_log', { 
          level: 'info', 
          message: `${currentAgent} Agent: Processed ${currentFile} - ${newRecords} records imported` 
        })
      }, 2000)
      
      activeImports.set(importId, { interval: importInterval, status: 'running' })
      
    } catch (error) {
      socket.emit('import_status', 'error')
      socket.emit('import_log', { level: 'error', message: `Import error: ${error.message}` })
    }
  })

  socket.on('pause_import', () => {
    socket.emit('import_status', 'paused')
    socket.emit('import_log', { level: 'warning', message: 'Import paused by user' })
  })

  socket.on('resume_import', () => {
    socket.emit('import_status', 'running')
    socket.emit('import_log', { level: 'info', message: 'Import resumed' })
  })

  socket.on('stop_import', () => {
    // Clear all active imports for this socket
    activeImports.forEach((importData, importId) => {
      if (importData.interval) {
        clearInterval(importData.interval)
      }
    })
    activeImports.clear()
    
    socket.emit('import_status', 'idle')
    socket.emit('import_log', { level: 'warning', message: 'Import stopped by user' })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    // Clean up any active imports for this socket
    activeImports.forEach((importData, importId) => {
      if (importData.interval) {
        clearInterval(importData.interval)
      }
    })
  })
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 55910

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AAI Frontend Server running on port ${PORT}`)
  console.log(`📱 Frontend: http://localhost:${PORT}`)
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
})