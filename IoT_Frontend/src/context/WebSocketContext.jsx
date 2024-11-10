import React, { createContext, useEffect, useContext, useState, useCallback } from 'react';
import { DataContext } from './DataContext';
import io from 'socket.io-client';
import config from '../config/config';

// Socket Configuration
const getSocketConfig = () => {
  const URL = config.wsUrl;
  
  const socketOptions = {
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
  };

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
  
  // Alert state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const onUpdateControladores = useCallback((data) => {
    console.log('Received new data for controladores:', data);
    if (updateControlador) {
      updateControlador(data);
    } else {
      console.error('updateControlador not available');
    }
  }, [updateControlador]);

  // Alert handlers
  const handleNewAlert = useCallback((data) => {
    console.log('Received new alert:', data);
    const newNotification = {
      id: Date.now(),
      title: data.alert.name,
      message: `${data.log.sensor_name}: ${data.log.old_value ? 'ON' : 'OFF'} → ${data.log.new_value ? 'ON' : 'OFF'}`,
      timestamp: new Date(),
      read: false,
      ...data
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    function onConnect() {
      console.log(`WebSocket connected. Socket ID: ${socket.id}`);
      socket.emit("message", `WebSocket connected. Socket ID: ${socket.id}`);
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
    socket.on('alert_triggered', handleNewAlert);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('update_controladores', onUpdateControladores);
      socket.off('alert_triggered', handleNewAlert);
    };
  }, [onUpdateControladores, handleNewAlert]);

  const value = {
    isConnected,
    socket,
    // Alert-related values
    notifications,
    unreadCount,
    markAllAsRead,
    clearAllNotifications
  };

  return (
    <WebSocketContext.Provider value={value}>
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