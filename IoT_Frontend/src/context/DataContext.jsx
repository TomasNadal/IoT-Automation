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
        const responseDashboard = await axios.get('http://localhost:5000/dashboard/empresa/1/dashboard'); // Adjust the endpoint as necessary
        const responseStats = await axios.get('http://localhost:5000/dashboard/empresa/1/connected_stats'); // Adjust the endpoint as necessary

        const data = responseDashboard.data;
        const connectedStats = responseStats.data;

        // Process data to find last signal and image name for each controlador
        const processedControladores = data.map(item => {
          const controlador = item.controlador;
          const signals = item.signals;

          // Update signals and last_signal with config names
          const updatedSignals = signals.map(signal => updateSignalWithConfig(signal, controlador.config));
          const lastSignal = updatedSignals.length ? updatedSignals[0] : null;

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
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData(); // Fetch data once when the provider is mounted
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
    <DataContext.Provider value={{ controladores, connectedStats, isDataLoading, errorData }}>
      {children}
    </DataContext.Provider>
  );
};

export { DataContext, DataProvider };
