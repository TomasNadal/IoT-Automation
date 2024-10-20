import React, { useContext } from 'react';
import { DataContext } from '../../context/DataContext';

const TestComponent = () => {
  const { controladores, connectedStats } = useContext(DataContext);

  return (
    <div>
      <h2>Connected Stats</h2>
      <p>Connected: {connectedStats.connected}</p>
      <p>Disconnected: {connectedStats.disconnected}</p>
      <h2>Controladores</h2>
      {controladores.map(controlador => (
        <div key={controlador.id}>
          <h3>{controlador.name}</h3>
          <p>Last Signal: {controlador.last_signal ? new Date(controlador.last_signal.tstamp).toLocaleString() : 'N/A'}</p>
          <p>Señales Count: {controlador.señales.length}</p>
        </div>
      ))}
    </div>
  );
};

export default TestComponent;