import React, { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText,
  Database
} from 'lucide-react'
import { apiService } from '../services/api'

const ImportPage = () => {
  const [selectedFolder, setSelectedFolder] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [importStatus, setImportStatus] = useState('idle') // idle, running, paused, completed, error
  const [progress, setProgress] = useState({
    currentFile: '',
    filesProcessed: 0,
    totalFiles: 0,
    recordsImported: 0,
    currentAgent: '',
    overallProgress: 0
  })
  const [logs, setLogs] = useState([])
  const [fileDiscovery, setFileDiscovery] = useState([])
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    // Initialize with default values
    setSelectedFolder('/workspace/data/aai')
    setCollectionName('aai_comprehensive_automotive')
    
    // Load file discovery data
    loadFileDiscovery()
  }, [])

  const loadFileDiscovery = async () => {
    try {
      const discovery = await apiService.scanFiles()
      setFileDiscovery(discovery.files || [])
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `📊 Discovered ${discovery.total || 0} files across ${discovery.agents?.length || 0} data formats`
      }])
    } catch (error) {
      console.error('File discovery failed:', error)
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `❌ File discovery failed: ${error.message}`
      }])
    }
  }

  const handleFolderSelect = async () => {
    try {
      // Use the file system API to select folder
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker()
        setSelectedFolder(dirHandle.name)
        
        // Discover files in the selected folder
        socket?.emit('discover_files', { folderPath: dirHandle.name })
      } else {
        // Fallback for browsers that don't support the File System API
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.multiple = true
        input.onchange = (e) => {
          const files = Array.from(e.target.files)
          if (files.length > 0) {
            const folderPath = files[0].webkitRelativePath.split('/')[0]
            setSelectedFolder(folderPath)
            loadFileDiscovery()
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
    }
  }

  const startImport = async () => {
    if (!collectionName) {
      alert('Please enter a collection name')
      return
    }

    setImportStatus('running')
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '🚀 Starting AAI Comprehensive Import...'
    }])

    try {
      const result = await apiService.startImport(collectionName, fileDiscovery)
      setImportResult(result)
      setImportStatus('completed')
      
      // Add result instructions to logs
      if (result.instructions) {
        result.instructions.forEach(instruction => {
          setLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: instruction
          }])
        })
      }
      
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'success',
        message: `✅ ${result.message || 'Import completed successfully'}`
      }])
      
    } catch (error) {
      setImportStatus('error')
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `❌ Import failed: ${error.message}`
      }])
    }
  }

  const pauseImport = () => {
    setImportStatus('paused')
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '⏸️ Import paused (local control only)'
    }])
  }

  const resumeImport = () => {
    setImportStatus('running')
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '▶️ Import resumed (local control only)'
    }])
  }

  const stopImport = () => {
    setImportStatus('idle')
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '⏹️ Import stopped (local control only)'
    }])
  }

  const getStatusIcon = () => {
    switch (importStatus) {
      case 'running': return <Play className="h-5 w-5 text-green-600" />
      case 'paused': return <Pause className="h-5 w-5 text-yellow-600" />
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />
      default: return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (importStatus) {
      case 'running': return 'text-green-600 bg-green-50'
      case 'paused': return 'text-yellow-600 bg-yellow-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const AgentCard = ({ agent, isActive }) => (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
      isActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{agent.name}</h4>
          <p className="text-sm text-gray-500">{agent.filesHandled} files</p>
        </div>
        {isActive && (
          <div className="flex items-center">
            <div className="animate-pulse h-2 w-2 bg-primary-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-primary-600">Active</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((agent.processed / agent.total) * 100)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(agent.processed / agent.total) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
        <p className="mt-2 text-gray-600">
          Select a folder and import all files into Qdrant with specialized micro-agents
        </p>
      </div>

      {/* Import Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleFolderSelect}
                className="btn-secondary flex items-center"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Choose Folder
              </button>
              {selectedFolder && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                  {selectedFolder}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Name
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Enter collection name"
              className="input-field"
            />
          </div>
        </div>

        {/* File Discovery Results */}
        {fileDiscovery.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Discovered Files ({fileDiscovery.length} total)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(
                fileDiscovery.reduce((acc, file) => {
                  const agent = file.agent || 'Unknown'
                  acc[agent] = (acc[agent] || 0) + 1
                  return acc
                }, {})
              ).map(([agent, count]) => (
                <div key={agent} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{agent}</p>
                  <p className="text-sm text-gray-500">{count} files</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Controls */}
        <div className="mt-6 flex items-center space-x-3">
          {importStatus === 'idle' && (
            <button
              onClick={startImport}
              disabled={!selectedFolder || !collectionName}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Import
            </button>
          )}

          {importStatus === 'running' && (
            <>
              <button onClick={pauseImport} className="btn-secondary flex items-center">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </button>
              <button onClick={stopImport} className="btn-secondary flex items-center text-red-600">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </button>
            </>
          )}

          {importStatus === 'paused' && (
            <>
              <button onClick={resumeImport} className="btn-primary flex items-center">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </button>
              <button onClick={stopImport} className="btn-secondary flex items-center text-red-600">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import Progress */}
      {importStatus !== 'idle' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Import Progress</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-2 capitalize">{importStatus}</span>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{progress.filesProcessed} / {progress.totalFiles} files</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress.overallProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Current File */}
          {progress.currentFile && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-900">Currently Processing</p>
                  <p className="text-sm text-blue-700">{progress.currentFile}</p>
                  <p className="text-xs text-blue-600">Agent: {progress.currentAgent}</p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{progress.filesProcessed}</p>
              <p className="text-sm text-gray-600">Files Processed</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{progress.recordsImported.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Records Imported</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{progress.totalFiles - progress.filesProcessed}</p>
              <p className="text-sm text-gray-600">Files Remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Logs */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Logs</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet. Start an import to see progress...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className={`ml-2 ${
                  log.level === 'error' ? 'text-red-400' : 
                  log.level === 'warning' ? 'text-yellow-400' : 
                  log.level === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportPage