// AAI System Connection Configuration
export const API_BASE_URL = 'https://aai-uhm0.onrender.com';

export const AAI_CONFIG = {
  // Real AAI Search API (currently running)
  SEARCH_API: {
    url: API_BASE_URL,
    endpoints: {
      search: '/api/search',
      stats: '/api/stats',
      health: '/api/health'
    }
  },

  // External Qdrant Database
  QDRANT: {
    url: 'http://34.40.104.64:6333',
    collection: 'aai_comprehensive_automotive',
    dashboard: 'http://34.40.104.64:6333/dashboard#/collections'
  },

  // Micro-Agent System
  MICRO_AGENTS: {
    script: '/workspace/aai_import_system.py',
    data_path: '/workspace/data/aai',
    agents: ['TecDoc', 'AutoCare', 'MM', 'IA', 'Polk', 'PIES']
  },

  // Real Data Status
  DATA_STATUS: {
    total_points: 249,
    sources: {
      TecDoc: 200,
      AutoCare: 20, 
      MM: 10,
      IA: 1,
      Polk: 1,
      PIES: 1
    },
    last_updated: '2025-08-12'
  }
};

export default AAI_CONFIG;