import React, { useState, useEffect } from 'react'
import { 
  Database, 
  Files, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalPoints: 0,
    lastImport: null,
    systemStatus: 'healthy'
  })

  const [recentActivity, setRecentActivity] = useState([])
  const [collectionStats, setCollectionStats] = useState([])

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData()
    
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        totalCollections: 2,
        totalPoints: 38,
        lastImport: new Date().toISOString(),
        systemStatus: 'healthy'
      })

      setRecentActivity([
        { id: 1, action: 'Import completed', collection: 'aai_quick_demo', records: 38, timestamp: new Date() },
        { id: 2, action: 'Collection created', collection: 'aai_automotive_demo', records: 0, timestamp: new Date(Date.now() - 300000) },
        { id: 3, action: 'Search query executed', collection: 'aai_quick_demo', records: 5, timestamp: new Date(Date.now() - 600000) },
      ])

      setCollectionStats([
        { name: 'TecDoc', files: 923, status: 'pending' },
        { name: 'AutoCare', files: 147, status: 'partial' },
        { name: 'MM', files: 10, status: 'completed' },
        { name: 'IA', files: 1, status: 'pending' },
        { name: 'Polk', files: 1, status: 'pending' },
        { name: 'PIES', files: 1, status: 'pending' },
        { name: 'Excel', files: 1, status: 'completed' },
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => (
    <div className="card p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'partial': return 'text-yellow-600 bg-yellow-50'
      case 'pending': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'partial': return Clock
      case 'pending': return AlertCircle
      default: return AlertCircle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your AAI data import system and collections
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Collections"
          value={stats.totalCollections}
          icon={Database}
          color="primary"
        />
        <StatCard
          title="Total Records"
          value={stats.totalPoints.toLocaleString()}
          icon={Files}
          color="success"
        />
        <StatCard
          title="System Status"
          value="Healthy"
          icon={Activity}
          color="success"
        />
        <StatCard
          title="Available Files"
          value="1,084"
          icon={TrendingUp}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Status */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Data Source Status
          </h3>
          <div className="space-y-3">
            {collectionStats.map((item) => {
              const StatusIcon = getStatusIcon(item.status)
              return (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <StatusIcon className={`h-5 w-5 mr-3 ${getStatusColor(item.status).split(' ')[0]}`} />
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.files} files</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center p-3 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">
                    {activity.collection} • {activity.records} records
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import Progress Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Import Progress by Data Source
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={collectionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="files" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard