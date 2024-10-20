import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { tokens } from '../theme';
import IdIcon from '@mui/icons-material/Fingerprint';
import NameIcon from '@mui/icons-material/Label';
import SignalIcon from '@mui/icons-material/AccessTime';
import './ControllerInfo.css';

const SensorIcon = ({ sensorKey, config, lastSignal, isConnected }) => {
  const sensorName = config.name;
  const sensorValue = isConnected ? lastSignal?.[sensorKey] : undefined;
  const sensorType = config.tipo;
  const imageName = sensorName.toLowerCase().replace(/\s+/g, '');

  const getSensorClassName = (sensorName, sensorValue, sensorType, isConnected) => {
    const baseClass = 'sensor-container';
    const colorClass = sensorName.toLowerCase().replace(/\s+/g, '');
    
    if (!isConnected) return `${baseClass} no-tension ${colorClass}`;
    if (sensorValue === undefined) return `${baseClass} no-tension ${colorClass}`;
    
    // Determine if the sensor is "on" based on its type and value
    const isOn = sensorType === 'NA' ? sensorValue : !sensorValue;
    return `${baseClass} ${isOn ? 'on' : 'off'} ${colorClass}`;
  };

  const className = getSensorClassName(sensorName, sensorValue, sensorType, isConnected);

  return (
    <div className={className}>
      <img src={`/images/sensors/${imageName}.png`} alt={sensorName} />
      <div className="sensor-tooltip">
        {`${sensorName}: ${sensorValue ? 'ON' : 'OFF'}, ${sensorType}, Email: ${config.email ? 'Yes' : 'No'}`}
      </div>
    </div>
  );
};

const ControllerInfo = ({ controller }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isConnected = controller.last_signal && 
    (new Date().getTime() - new Date(controller.last_signal.tstamp).getTime() < 5 * 60 * 1000);

  return (
    <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
      <CardContent className="controller-info">
        <Typography variant="h5" mb={2}>Controller Information</Typography>
        <Box className="controller-header">
          <Box className="controller-header-item">
            <IdIcon sx={{ color: colors.greenAccent[500] }} />
            <Typography variant="body2">{controller.id}</Typography>
          </Box>
          <Box className="controller-header-item">
            <NameIcon sx={{ color: colors.greenAccent[500] }} />
            <Typography variant="body2">{controller.name}</Typography>
          </Box>
          <Box className="controller-header-item">
            <SignalIcon sx={{ color: colors.greenAccent[500] }} />
            <Typography variant="body2">
              {controller.last_signal 
                ? new Date(controller.last_signal.tstamp).toLocaleString() 
                : 'N/A'}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="h6" mb={2}>Sensor Status</Typography>
        <Box className="sensors-grid">
          <div className={`sensor-container tension ${isConnected ? 'on' : 'off'}`}>
            <img
              src={isConnected ? '/images/sensors/tension.png' : '/images/sensors/notension.png'}
              alt="Conectado"
            />
          </div>
          {Object.entries(controller.config).map(([key, config]) => (
            <SensorIcon
              key={key}
              sensorKey={key}
              config={config}
              lastSignal={controller.last_signal}
              isConnected={isConnected}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ControllerInfo;