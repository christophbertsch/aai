import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Car,
  Wrench,
  Target,
  Activity,
  Zap,
  Award
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
import { API_BASE_URL } from '../config/connections'

const AnalyticsPage = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [brandData, setBrandData] = useState(null)
  const [partsData, setPartsData] = useState(null)
  const [competitiveData, setCompetitiveData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeAnalysis, setActiveAnalysis] = useState('dashboard')

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`)
      const data = await response.json()
      setDashboardData(data)
      setActiveAnalysis('dashboard')
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBrandAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/brands`)
      const data = await response.json()
      setBrandData(data)
      setActiveAnalysis('brands')
    } catch (error) {
      console.error('Error fetching brand analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPartsAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/parts`)
      const data = await response.json()
      setPartsData(data)
      setActiveAnalysis('parts')
    } catch (error) {
      console.error('Error fetching parts analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompetitiveAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/competitive`)
      const data = await response.json()
      setCompetitiveData(data)
      setActiveAnalysis('competitive')
    } catch (error) {
      console.error('Error fetching competitive analysis:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">🔍 Market Intelligence & Analytics</h1>
          <p className="mt-2 text-gray-600">
            Real-time automotive industry insights from 1,007 data points
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={fetchDashboard}
          disabled={isLoading}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeAnalysis === 'dashboard' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <Activity className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Dashboard Overview</h3>
          <p className="text-sm text-gray-600 mt-1">System metrics & KPIs</p>
        </button>

        <button
          onClick={fetchBrandAnalysis}
          disabled={isLoading}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeAnalysis === 'brands' 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <Car className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Brand Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Compare major automotive brands</p>
        </button>

        <button
          onClick={fetchPartsAnalysis}
          disabled={isLoading}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeAnalysis === 'parts' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 hover:border-orange-300'
          }`}
        >
          <Wrench className="h-8 w-8 text-orange-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Parts Intelligence</h3>
          <p className="text-sm text-gray-600 mt-1">Category analysis & trends</p>
        </button>

        <button
          onClick={fetchCompetitiveAnalysis}
          disabled={isLoading}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeAnalysis === 'competitive' 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <Target className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Competitive Intel</h3>
          <p className="text-sm text-gray-600 mt-1">Market gaps & opportunities</p>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Analyzing automotive data...</p>
          </div>
        </div>
      )}

      {/* Dashboard Overview */}
      {activeAnalysis === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Data Points"
              value={dashboardData.kpis?.data_points?.toLocaleString() || '0'}
              icon={BarChart3}
              color="blue"
            />
            <MetricCard
              title="Data Sources"
              value={dashboardData.kpis?.sources_integrated || '0'}
              icon={PieChart}
              color="green"
            />
            <MetricCard
              title="File Types"
              value={dashboardData.kpis?.file_types_supported || '0'}
              icon={TrendingUp}
              color="purple"
            />
            <MetricCard
              title="Search Ready"
              value={dashboardData.kpis?.search_ready ? "✅ Yes" : "❌ No"}
              icon={Zap}
              color="green"
            />
          </div>

          {dashboardData.dashboard_data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.dashboard_data.data_distribution.data_sources).map(([source, count], index) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="font-medium">{source}</span>
                      </div>
                      <span className="text-gray-600">{count} points</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">Primary Source</p>
                    <p className="text-blue-700">{dashboardData.dashboard_data.quick_insights.primary_source}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-900">Data Richness Score</p>
                    <p className="text-green-700">{dashboardData.dashboard_data.quick_insights.data_richness_score}/100</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium text-purple-900">Coverage Completeness</p>
                    <p className="text-purple-700">{dashboardData.dashboard_data.quick_insights.coverage_completeness}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Analysis */}
      {activeAnalysis === 'brands' && brandData && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Brand Market Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gold-50 rounded-lg border border-yellow-200">
                <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h4 className="font-medium text-yellow-900">Top Brand</h4>
                <p className="text-2xl font-bold text-yellow-600">{brandData.insights?.top_brand || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-blue-900">Brands Analyzed</h4>
                <p className="text-2xl font-bold text-blue-600">{brandData.total_brands_analyzed || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-green-900">Data Points</h4>
                <p className="text-2xl font-bold text-green-600">{brandData.total_data_points || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Brand Mentions</h4>
                <div className="space-y-2">
                  {Object.entries(brandData.brands || {})
                    .sort(([,a], [,b]) => b.mentions - a.mentions)
                    .slice(0, 8)
                    .map(([brand, data], index) => (
                    <div key={brand} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{brand}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{data.mentions} mentions</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(data.mentions / Math.max(...Object.values(brandData.brands).map(b => b.mentions))) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">File Coverage</h4>
                <div className="space-y-2">
                  {Object.entries(brandData.insights?.data_richness || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([brand, fileCount]) => (
                    <div key={brand} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{brand}</span>
                      <span className="text-sm text-gray-600">{fileCount} files</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parts Analysis */}
      {activeAnalysis === 'parts' && partsData && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Parts Category Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Wrench className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h4 className="font-medium text-orange-900">Top Category</h4>
                <p className="text-2xl font-bold text-orange-600">{partsData.market_insights?.top_category || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-blue-900">Categories</h4>
                <p className="text-2xl font-bold text-blue-600">{partsData.total_categories || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-green-900">Data Points</h4>
                <p className="text-2xl font-bold text-green-600">{partsData.total_data_points || 0}</p>
              </div>
            </div>

            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(partsData.market_insights?.coverage_distribution || {}).map(([category, mentions]) => ({
                  category,
                  mentions
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="mentions" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Category Coverage</h4>
                <div className="space-y-2">
                  {Object.entries(partsData.market_insights?.coverage_distribution || {})
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, mentions]) => (
                    <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-gray-600">{mentions} mentions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Brand Coverage by Category</h4>
                <div className="space-y-2">
                  {Object.entries(partsData.market_insights?.brand_coverage || {})
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, brandCount]) => (
                    <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-gray-600">{brandCount} brands</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Competitive Analysis */}
      {activeAnalysis === 'competitive' && competitiveData && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Competitive Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium text-purple-900">Dominant Segment</h4>
                <p className="text-2xl font-bold text-purple-600">{competitiveData.market_insights?.dominant_segment || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-blue-900">Coverage Ratio</h4>
                <p className="text-2xl font-bold text-blue-600">{Math.round((competitiveData.market_insights?.coverage_ratio || 0) * 100)}%</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-green-900">Total Mentions</h4>
                <p className="text-2xl font-bold text-green-600">{competitiveData.market_insights?.total_competitive_mentions || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Market Segments</h4>
                <div className="space-y-3">
                  {Object.entries(competitiveData.segments || {}).map(([segment, data]) => (
                    <div key={segment} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{segment}</span>
                        <span className="text-sm text-gray-600">{data.total_mentions} mentions</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {data.data_coverage} brands covered
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Strategic Recommendations</h4>
                <div className="space-y-2">
                  {(competitiveData.recommendations || []).map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
                
                {competitiveData.market_insights?.market_gaps?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Market Gaps</h5>
                    <div className="flex flex-wrap gap-2">
                      {competitiveData.market_insights.market_gaps.map((gap) => (
                        <span key={gap} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage