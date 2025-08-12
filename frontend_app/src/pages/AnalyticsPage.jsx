import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState({
    overview: {},
    sourceDistribution: [],
    importTrends: [],
    searchPatterns: [],
    topQueries: []
  })
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [isLoading, setIsLoading] = useState(false)

  const timeRanges = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ]

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  useEffect(() => {
    fetchAnalytics()
  }, [selectedTimeRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setAnalytics({
        overview: {
          totalRecords: 1250000,
          totalCollections: 5,
          avgSearchTime: 0.15,
          successRate: 98.5
        },
        sourceDistribution: [
          { name: 'TecDoc', value: 850000, percentage: 68 },
          { name: 'AutoCare', value: 200000, percentage: 16 },
          { name: 'MM', value: 120000, percentage: 9.6 },
          { name: 'IA', value: 50000, percentage: 4 },
          { name: 'Polk', value: 25000, percentage: 2 },
          { name: 'Others', value: 5000, percentage: 0.4 }
        ],
        importTrends: [
          { date: '2024-01-01', records: 50000, files: 120 },
          { date: '2024-01-02', records: 75000, files: 180 },
          { date: '2024-01-03', records: 120000, files: 250 },
          { date: '2024-01-04', records: 200000, files: 400 },
          { date: '2024-01-05', records: 180000, files: 350 },
          { date: '2024-01-06', records: 220000, files: 450 },
          { date: '2024-01-07', records: 250000, files: 500 }
        ],
        searchPatterns: [
          { hour: 0, searches: 45 },
          { hour: 1, searches: 32 },
          { hour: 2, searches: 28 },
          { hour: 3, searches: 25 },
          { hour: 4, searches: 30 },
          { hour: 5, searches: 40 },
          { hour: 6, searches: 65 },
          { hour: 7, searches: 85 },
          { hour: 8, searches: 120 },
          { hour: 9, searches: 150 },
          { hour: 10, searches: 180 },
          { hour: 11, searches: 200 },
          { hour: 12, searches: 190 },
          { hour: 13, searches: 210 },
          { hour: 14, searches: 220 },
          { hour: 15, searches: 195 },
          { hour: 16, searches: 175 },
          { hour: 17, searches: 160 },
          { hour: 18, searches: 140 },
          { hour: 19, searches: 110 },
          { hour: 20, searches: 90 },
          { hour: 21, searches: 75 },
          { hour: 22, searches: 60 },
          { hour: 23, searches: 50 }
        ],
        topQueries: [
          { query: 'brake pads BMW', count: 1250, avgScore: 0.85 },
          { query: 'oil filter Mercedes', count: 980, avgScore: 0.82 },
          { query: 'spark plugs Audi', count: 875, avgScore: 0.88 },
          { query: 'transmission fluid', count: 720, avgScore: 0.79 },
          { query: 'air filter Honda', count: 650, avgScore: 0.86 }
        ]
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">
            Insights and metrics for your AAI data import system
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="input-field w-auto"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Records"
          value={analytics.overview.totalRecords?.toLocaleString() || '0'}
          change={12.5}
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Collections"
          value={analytics.overview.totalCollections || '0'}
          change={25}
          icon={PieChart}
          color="green"
        />
        <MetricCard
          title="Avg Search Time"
          value={`${analytics.overview.avgSearchTime || 0}s`}
          change={-8.2}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Success Rate"
          value={`${analytics.overview.successRate || 0}%`}
          change={2.1}
          icon={TrendingUp}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Source Distribution */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Data Source Distribution</h3>
            <button className="btn-secondary flex items-center text-sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <RechartsPieChart
                  data={analytics.sourceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {analytics.sourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </RechartsPieChart>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {analytics.sourceDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.name} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Import Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.importTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value.toLocaleString(), 'Records']}
                />
                <Area 
                  type="monotone" 
                  dataKey="records" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Patterns */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Patterns (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.searchPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} />
                <YAxis />
                <Tooltip labelFormatter={(value) => `${value}:00`} />
                <Line 
                  type="monotone" 
                  dataKey="searches" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Search Queries */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Search Queries</h3>
          <div className="space-y-3">
            {analytics.topQueries.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{query.query}</p>
                  <p className="text-sm text-gray-500">
                    {query.count} searches • Avg score: {query.avgScore}
                  </p>
                </div>
                <div className="text-right">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(query.count / analytics.topQueries[0]?.count) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Most Active Agent</h4>
            <p className="text-2xl font-bold text-blue-600">TecDoc</p>
            <p className="text-sm text-blue-700">68% of all data</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Peak Search Hour</h4>
            <p className="text-2xl font-bold text-green-600">2:00 PM</p>
            <p className="text-sm text-green-700">220 searches/hour</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Best Search Agent</h4>
            <p className="text-2xl font-bold text-purple-600">Semantic</p>
            <p className="text-sm text-purple-700">0.85 avg score</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage