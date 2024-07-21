import React, { createContext, useEffect, useContext, useRef } from 'react';
import { DataContext } from './DataContext';
import io from 'socket.io-client';


const WebSocketContext = createContext();

const WebSocketProvider = ({ children }) => {
  const { setControladores, setConnectedStats } = useContext(DataContext);
  const socketRef = useRef(null);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.close(); // Ensure any existing socket is closed
    }

    // Connect to the default namespace
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'], // Specify the transport protocols
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      newSocket.emit('my_event', { data: 'I\'m connected!' });
      console.log('WebSocket connected to default namespace');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    newSocket.on('update_controladores', data => {
      console.log('Received new data for controladores:', data);
      setControladores(prevControladores => {
        return prevControladores.map(controlador => {
          if (controlador.id === data.controlador_id) {
            const newSignal = updateSignalWithConfig(data.new_signal, controlador.config);
            const updatedSeñales = [...controlador.señales, newSignal].slice(-100); // Keep last 100 signals
            return {
              ...controlador,
              señales: updatedSeñales,
              last_signal: newSignal
            };
          }
          return controlador;
        });
      });
    });

    newSocket.on('update_connected_stats', data => {
      console.log('Received new data for connected stats:', data);
      setConnectedStats(data);
    });

    const updateSignalWithConfig = (signal, config) => {
      let updatedSignal = { ...signal };
      for (let [key, value] of Object.entries(config)) {
        const sensorName = value.name;
        const sensorType = value.tipo === "NC";
    
        updatedSignal[sensorName] = updatedSignal[key];
        delete updatedSignal[key];
        updatedSignal[`${sensorName}_type`] = sensorType;
      }
      return updatedSignal;
    };

    return () => {
      if (newSocket) {
        newSocket.close();
        console.log('WebSocket closed');
      }
    };
  }, [setControladores, setConnectedStats]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext, WebSocketProvider };
