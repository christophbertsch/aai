import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Database,
  Zap,
  Target,
  Brain,
  FileText,
  BarChart3
} from 'lucide-react'

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('semantic')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [collections, setCollections] = useState([])
  const [filters, setFilters] = useState({
    source: '',
    dateRange: '',
    minScore: 0.5
  })

  const searchAgents = [
    {
      id: 'semantic',
      name: 'Semantic Search',
      description: 'Find similar content using AI embeddings',
      icon: Brain,
      color: 'blue'
    },
    {
      id: 'keyword',
      name: 'Keyword Search',
      description: 'Traditional text-based search',
      icon: Search,
      color: 'green'
    },
    {
      id: 'technical',
      name: 'Technical Analysis',
      description: 'Search for technical specifications and part numbers',
      icon: Target,
      color: 'purple'
    },
    {
      id: 'competitive',
      name: 'Competitive Intelligence',
      description: 'Analyze competitor data and market insights',
      icon: BarChart3,
      color: 'orange'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Search',
      description: 'Combines semantic and keyword search',
      icon: Zap,
      color: 'red'
    }
  ]

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const response = await fetch('http://localhost:6333/collections')
      const data = await response.json()
      setCollections(data.result.collections || [])
      if (data.result.collections.length > 0) {
        setSelectedCollection(data.result.collections[0].name)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    }
  }

  const handleSearch = async () => {
    if (!query.trim() || !selectedCollection) return

    setIsSearching(true)
    try {
      const response = await fetch('http://localhost:55910/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          collection: selectedCollection,
          agent: selectedAgent,
          filters,
          limit: 20
        })
      })

      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error('Error searching:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const exportResults = () => {
    const csv = [
      ['Score', 'Source', 'Content', 'File', 'Timestamp'],
      ...searchResults.map(result => [
        result.score,
        result.payload?.source || '',
        result.payload?.content?.substring(0, 100) || '',
        result.payload?.file_name || '',
        result.payload?.timestamp || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const AgentCard = ({ agent, isSelected, onClick }) => {
    const Icon = agent.icon
    return (
      <div
        onClick={onClick}
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
          isSelected 
            ? `border-${agent.color}-500 bg-${agent.color}-50` 
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-center mb-2">
          <Icon className={`h-5 w-5 mr-2 text-${agent.color}-600`} />
          <h4 className="font-medium text-gray-900">{agent.name}</h4>
        </div>
        <p className="text-sm text-gray-600">{agent.description}</p>
      </div>
    )
  }

  const ResultCard = ({ result, index }) => (
    <div className="card p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            result.score > 0.8 ? 'bg-green-500' : 
            result.score > 0.6 ? 'bg-yellow-500' : 'bg-gray-500'
          }`}>
            {Math.round(result.score * 100)}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">
              {result.payload?.source || 'Unknown Source'}
            </p>
            <p className="text-sm text-gray-500">
              {result.payload?.file_name || 'Unknown File'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.payload?.content?.substring(0, 300)}
          {result.payload?.content?.length > 300 && '...'}
        </p>
      </div>

      {result.payload?.fields && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(result.payload.fields).slice(0, 3).map(([key, value]) => (
            <span key={key} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {key}: {String(value).substring(0, 20)}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search & Analysis</h1>
        <p className="mt-2 text-gray-600">
          Use specialized AI agents to search and analyze your automotive data
        </p>
      </div>

      {/* Search Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Configuration</h3>
        
        {/* Collection Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Collection
          </label>
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a collection...</option>
            {collections.map((collection) => (
              <option key={collection.name} value={collection.name}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Agents */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Search Agent
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent === agent.id}
                onClick={() => setSelectedAgent(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your search query..."
                className="input-field pl-10"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim() || !selectedCollection}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="border-t pt-4">
          <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
            <Filter className="h-4 w-4 mr-1" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length})
            </h3>
            <button
              onClick={exportResults}
              className="btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </button>
          </div>

          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <ResultCard key={index} result={result} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && query && !isSearching && (
        <div className="card p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600">
            Try adjusting your search query or selecting a different search agent.
          </p>
        </div>
      )}

      {/* Search Tips */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Semantic Search</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use natural language queries</li>
              <li>• Search for concepts, not just keywords</li>
              <li>• Example: "brake pads for German cars"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Technical Analysis</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Search by part numbers or specifications</li>
              <li>• Use technical terminology</li>
              <li>• Example: "OEM 12345 torque specification"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPage