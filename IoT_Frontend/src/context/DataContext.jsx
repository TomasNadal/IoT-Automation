import React, { createContext, useState, useCallback, useEffect } from 'react';
import { useControladores } from '../hooks/useControladores';

export const DataContext = createContext();

const isControllerConnected = (controller) => {
  if (!controller.last_signal) return false;
  const lastSignalTime = new Date(controller.last_signal.tstamp).getTime();
  const currentTime = new Date().getTime();
  return (currentTime - lastSignalTime) < 5 * 60 * 1000; // 5 minutes in milliseconds
};

export const DataProvider = ({ children }) => {
  const { controladores: initialControladores, connectedStats: initialConnectedStats, isLoading, error, updateControlador: hookUpdateControlador } = useControladores();
  const [localControladores, setLocalControladores] = useState([]);
  const [localConnectedStats, setLocalConnectedStats] = useState({ connected: 0, disconnected: 0 });

  const updateConnectedStats = useCallback((controllers) => {
    const connected = controllers.filter(isControllerConnected).length;
    const disconnected = controllers.length - connected;
    setLocalConnectedStats({ connected, disconnected });
  }, []);

  useEffect(() => {
    if (initialControladores.length > 0) {
      setLocalControladores(initialControladores);
      updateConnectedStats(initialControladores);
    }
  }, [initialControladores, updateConnectedStats]);

  const updateControlador = useCallback((newData) => {
    console.log('Updating controlador with new data:', newData);
    hookUpdateControlador(newData);
    setLocalControladores((prevControladores) => {
      const updatedControladores = prevControladores.map(controlador => {
        if (controlador.id === newData.controlador_id) {
          console.log('Updating controlador:', controlador.id);
          return {
            ...controlador,
            last_signal: newData.new_signal,
            señales: [newData.new_signal, ...controlador.señales.slice(0, 99)] // Keep last 100 signals
          };
        }
        return controlador;
      });

      console.log('Updated controladores:', updatedControladores);
      updateConnectedStats(updatedControladores);
      return updatedControladores;
    });
  }, [hookUpdateControlador, updateConnectedStats]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      updateConnectedStats(localControladores);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(intervalId);
  }, [localControladores, updateConnectedStats]);

  return (
    <DataContext.Provider value={{ 
      controladores: localControladores, 
      connectedStats: localConnectedStats, 
      isLoading, 
      error, 
      updateControlador 
    }}>
      {children}
    </DataContext.Provider>
  );
};