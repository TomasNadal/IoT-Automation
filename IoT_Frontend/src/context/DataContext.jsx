import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create a context
const DataContext = createContext();

// Create a provider component
const DataProvider = ({ children }) => {
  const [controladores, setControladores] = useState([]);
  const [connectedStats, setConnectedStats] = useState({ connected: 0, disconnected: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [errorData, setErrorData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responseDashboard = await axios.get('http://localhost:5000/dashboard/empresa/1/dashboard');
        const responseStats = await axios.get('http://localhost:5000/dashboard/empresa/1/connected_stats');
  
        const data = responseDashboard.data;
        const connectedStats = responseStats.data;
  
        console.log('Fetched dashboard data:', data);
        console.log('Fetched connected stats:', connectedStats);
  
        const processedControladores = data.map(controlador => {
          
          
          const signals = controlador.señales;
  
          const updatedSignals = signals?.map(signal => updateSignalWithConfig(signal, controlador.config));
          const lastSignal = updatedSignals?.length ? updatedSignals[updatedSignals.length - 1] : null;

  
          return {
            ...controlador,
            señales: updatedSignals,
            last_signal: lastSignal
          };
        });
  
        setControladores(processedControladores);
        setConnectedStats(connectedStats);
      } catch (error) {
        setErrorData(error);
        console.error('Error fetching data:', error);
      } finally {
        setIsDataLoading(false);
      }
    };
  
    fetchData();
  }, []);

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

  return (
    <DataContext.Provider value={{ controladores, connectedStats, isDataLoading, errorData, setControladores, setConnectedStats }}>
      {children}
    </DataContext.Provider>
  );
};

export { DataContext, DataProvider };
