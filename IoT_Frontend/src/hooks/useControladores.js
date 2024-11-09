import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { useMemo } from 'react';
import config from '../config/config';

const fetchControladores = async () => {
  const [responseDashboard, responseStats] = await Promise.all([
    axios.get(`${config.apiUrl}/front/dashboard/empresa/b8cdf279-d884-4db1-aa2c-eb8d7e4c41bf/dashboard`),
    axios.get(`${config.apiUrl}/front/dashboard/empresa/b8cdf279-d884-4db1-aa2c-eb8d7e4c41bf/connected_stats`)
  ]);
  
  const processedControladores = responseDashboard.data.map(controlador => {
    // Since config is null in the provided data, we'll skip the updateSignalWithConfig step
    const lastSignal = controlador.señales.length ? controlador.señales[0] : null;

    return {
      ...controlador,
      last_signal: lastSignal
    };
  });

  return {
    controladores: processedControladores,
    connectedStats: responseStats.data
  };
};

// We'll keep this function in case it's needed in the future
const updateSignalWithConfig = (signal, config) => {
  if (!config) return signal;
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
    staleTime: 60000,
    cacheTime: 3600000,
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
            const newSignal = newData.new_signal; // Removed updateSignalWithConfig as config is null
            const updatedSeñales = [newSignal, ...controlador.señales].slice(0, 100);
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