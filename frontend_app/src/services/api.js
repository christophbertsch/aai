import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://aai-backend.vercel.app/api'  // Replace with your actual backend URL
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Mock data for when backend is not available
const mockData = {
  collections: [
    { name: 'aai_quick_demo' },
    { name: 'aai_automotive_demo' }
  ],
  analytics: {
    totalRecords: 1250000,
    collections: 5,
    avgSearchTime: 0.15,
    successRate: 98.5,
    dataDistribution: [
      { name: 'TecDoc', value: 68, color: '#3b82f6' },
      { name: 'AutoCare', value: 16, color: '#10b981' },
      { name: 'MM', value: 9.6, color: '#f59e0b' },
      { name: 'IA', value: 4, color: '#ef4444' },
      { name: 'Polk', value: 2, color: '#8b5cf6' },
      { name: 'Others', value: 0.4, color: '#06b6d4' }
    ],
    importTrends: [
      { date: '1/1/2024', records: 50000 },
      { date: '1/2/2024', records: 75000 },
      { date: '1/3/2024', records: 120000 },
      { date: '1/4/2024', records: 180000 },
      { date: '1/5/2024', records: 220000 },
      { date: '1/6/2024', records: 250000 },
      { date: '1/7/2024', records: 260000 }
    ],
    searchPatterns: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      searches: Math.floor(Math.random() * 200) + 20
    })),
    topQueries: [
      { query: 'brake pads BMW', searches: 1250, score: 0.85 },
      { query: 'oil filter Mercedes', searches: 980, score: 0.82 },
      { query: 'spark plugs Audi', searches: 875, score: 0.88 },
      { query: 'transmission fluid', searches: 720, score: 0.79 },
      { query: 'air filter Honda', searches: 650, score: 0.86 }
    ]
  },
  searchResults: [
    {
      id: '1',
      title: 'BMW Brake Pads - Premium Quality',
      content: 'High-performance brake pads for BMW vehicles. Compatible with 3 Series, 5 Series, and X3 models.',
      score: 0.95,
      source: 'TecDoc',
      metadata: {
        partNumber: 'BP-BMW-001',
        brand: 'BMW',
        category: 'Brake System'
      }
    },
    {
      id: '2',
      title: 'Mercedes Oil Filter - OEM Specification',
      content: 'Original equipment manufacturer specification oil filter for Mercedes-Benz engines.',
      score: 0.92,
      source: 'AutoCare',
      metadata: {
        partNumber: 'OF-MB-002',
        brand: 'Mercedes-Benz',
        category: 'Engine'
      }
    }
  ]
};

// API functions with fallback to mock data
export const apiService = {
  async getCollections() {
    try {
      const response = await api.get('/collections');
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error.message);
      return { result: { collections: mockData.collections }, status: 'ok' };
    }
  },

  async getAnalytics() {
    try {
      const response = await api.get('/analytics');
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error.message);
      return mockData.analytics;
    }
  },

  async search(query, agent = 'semantic') {
    try {
      const response = await api.post('/search', { query, agent });
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error.message);
      return {
        results: mockData.searchResults.filter(result => 
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.content.toLowerCase().includes(query.toLowerCase())
        ),
        total: mockData.searchResults.length,
        agent: agent
      };
    }
  },

  async discoverFiles() {
    try {
      const response = await api.post('/discover_files');
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error.message);
      return {
        files: [
          { path: '/data/aai/tecdoc/0295.7z', size: 4200000, agent: 'TecDoc' },
          { path: '/data/aai/autocare/ChangeDetails.txt', size: 28800000, agent: 'AutoCare' },
          { path: '/data/aai/mm/MM20240619-165319-417.xml', size: 8300000, agent: 'MM' }
        ],
        total: 1119,
        totalSize: 4300000000
      };
    }
  },

  async startImport(collectionName, selectedFiles) {
    try {
      const response = await api.post('/import', { collectionName, selectedFiles });
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock response:', error.message);
      return {
        status: 'started',
        importId: 'mock-import-' + Date.now(),
        message: 'Import started (mock mode - backend not available)'
      };
    }
  }
};

export default apiService;