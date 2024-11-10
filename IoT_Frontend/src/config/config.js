const config = {
  development: {
    apiUrl: 'http://localhost:5000',
    wsUrl: 'ws://localhost:5000',
    isProduction: false
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL,
    // Ensure WebSocket URL uses wss:// for secure connections in production
    wsUrl: import.meta.env.VITE_WS_URL?.startsWith('wss://') 
      ? import.meta.env.VITE_WS_URL 
      : `wss://${import.meta.env.VITE_WS_URL}`,
    isProduction: true
  }
};

const environment = import.meta.env.VITE_ENV || 'development';
export default config[environment];