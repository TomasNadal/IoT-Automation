import React, { createContext, useState, useEffect, useContext } from 'react';
import { DataContext } from './DataContext';
import io from 'socket.io-client';

// Create a context
const WebSocketContext = createContext();

// Create a provider component
const WebSocketProvider = ({ children }) => {
  const { setControladores, setConnectedStats } = useContext(DataContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection with reconnection options
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    // Handle connection event
    newSocket.on('connect', () => {
      newSocket.emit('my_event', { data: 'I\'m connected!' });
      console.log('WebSocket connected');
    });

    // Handle disconnection event
    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Handle connection error
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Handle incoming messages
    newSocket.on('update_controladores', data => {
      setControladores(prevControladores => {
        const controladorIndex = prevControladores.findIndex(c => c.id === data.id);
        if (controladorIndex !== -1) {
          // Update existing controlador
          return prevControladores.map((controlador, index) =>
            index === controladorIndex ? { ...controlador, ...data } : controlador
          );
        } else {
          // Add new controlador
          return [...prevControladores, data];
        }
      });
    });

    newSocket.on('update_connected_stats', data => {
      setConnectedStats(data);
    });

    // Clean up on unmount
    return () => {
      newSocket.close();
    };
  }, [setControladores, setConnectedStats]);

  return (
    <WebSocketContext.Provider value={{ socket }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext, WebSocketProvider };
