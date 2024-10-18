import React, { createContext, useEffect, useContext, useState, useRef, useCallback } from 'react';
import { DataContext } from './DataContext';
import io from 'socket.io-client';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const dataContext = useContext(DataContext);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const onUpdateControladores = useCallback((data) => {
    console.log('Received new data for controladores:', data);
    if (dataContext && dataContext.updateControlador) {
      dataContext.updateControlador(data);
    } else {
      console.error('DataContext or updateControlador not available');
    }
  }, [dataContext]);

  useEffect(() => {
    if (!dataContext || !dataContext.updateControlador) {
      console.log('DataContext not ready yet');
      return;
    }

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('update_controladores', onUpdateControladores);

    return () => {
      socket.off('update_controladores', onUpdateControladores);
      socket.disconnect();
    };
  }, [dataContext, onUpdateControladores]);

  return (
    <WebSocketContext.Provider value={{ isConnected, socket: socketRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
};