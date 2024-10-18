import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { useMemo } from 'react';

const fetchControladores = async () => {
  const [responseDashboard, responseStats] = await Promise.all([
    axios.get('http://localhost:5000/dashboard/empresa/1/dashboard'),
    axios.get('http://localhost:5000/dashboard/empresa/1/connected_stats')
  ]);
  
  const processedControladores = responseDashboard.data.map(controlador => {
    const signals = controlador.señales || [];
    const updatedSignals = signals.map(signal => updateSignalWithConfig(signal, controlador.config));
    const lastSignal = updatedSignals.length ? updatedSignals[updatedSignals.length - 1] : null;

    return {
      ...controlador,
      señales: updatedSignals,
      last_signal: lastSignal
    };
  });

  return {
    controladores: processedControladores,
    connectedStats: responseStats.data
  };
};

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

export function useControladores() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery('controladores', fetchControladores, {
    staleTime: 60000, // Consider data fresh for 1 minute
    cacheTime: 3600000, // Keep unused data in cache for 1 hour
    onSuccess: (data) => {
      console.log('Data fetched and cached:', data);
    }
  });

  const memoizedData = useMemo(() => data, [data]);

  const updateControlador = (newData) => {
    queryClient.setQueryData('controladores', oldData => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        controladores: oldData.controladores.map(controlador => {
          if (controlador.id === newData.controlador_id) {
            const newSignal = updateSignalWithConfig(newData.new_signal, controlador.config);
            const updatedSeñales = [...(controlador.señales || []), newSignal].slice(-100);
            return {
              ...controlador,
              señales: updatedSeñales,
              last_signal: newSignal
            };
          }
          return controlador;
        })
      };
    });
  };

  return { 
    controladores: memoizedData?.controladores || [], 
    connectedStats: memoizedData?.connectedStats || { connected: 0, disconnected: 0 },
    isLoading, 
    error, 
    updateControlador 
  };
}