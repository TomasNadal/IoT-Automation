import React, { createContext, useEffect, useContext, useState, useCallback } from 'react';
import { DataContext } from './DataContext';
import io from 'socket.io-client';

// Socket Configuration
const getSocketConfig = () => {
  const URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com'  // Replace with your actual production domain
    : 'http://localhost:5000';  // Your development server URL

  const socketOptions = {
    path: '/socket.io',  // Adjust this if your server uses a different path
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  };

  if (process.env.NODE_ENV === 'production') {
    socketOptions.cert = process.env.REACT_APP_SSL_CERT;
    socketOptions.key = process.env.REACT_APP_SSL_KEY;
  }

  return { URL, socketOptions };
};

// Create socket instance
const { URL, socketOptions } = getSocketConfig();
const socket = io(URL, socketOptions);

// WebSocket Context
export const WebSocketContext = createContext();

// WebSocket Provider Component
export const WebSocketProvider = ({ children }) => {
  const { updateControlador } = useContext(DataContext);
  const [isConnected, setIsConnected] = useState(false);

  const onUpdateControladores = useCallback((data) => {
    console.log('Received new data for controladores:', data);
    if (updateControlador) {
      updateControlador(data);
    } else {
      console.error('updateControlador not available');
    }
  }, [updateControlador]);

  useEffect(() => {
    function onConnect() {
      console.log(`WebSocket connected. Socket ID: ${socket.id}`);
      setIsConnected(true);
    }

    function onDisconnect(reason) {
      console.log(`WebSocket disconnected. Reason: ${reason}`);
      setIsConnected(false);
    }

    function onConnectError(error) {
      console.error('Connection error:', error);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('update_controladores', onUpdateControladores);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('update_controladores', onUpdateControladores);
    };
  }, [onUpdateControladores]);

  return (
    <WebSocketContext.Provider value={{ isConnected, socket }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for using WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};