import React, { useState, useMemo } from 'react';
import { Box, Typography, Collapse, IconButton, useTheme, Grid } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Link } from "react-router-dom";
import { tokens } from '../../theme';
import './ControladoresList.css';

const isControllerConnected = (controller) => {
  if (!controller.last_signal) return false;
  
  const lastSignalTime = new Date(controller.last_signal.tstamp);
  const currentTime = new Date();

  console.log('Last signal time (UTC):', lastSignalTime.toUTCString());
  console.log('Current time (local):', currentTime.toString());
  console.log('Current time (UTC):', currentTime.toUTCString());

  // Calculate the time difference correctly
  const timeDifference = currentTime.getTime() - lastSignalTime.getTime();
  console.log('Time difference (ms):', timeDifference);

  const isConnected = timeDifference < 5 * 60 * 1000;
  console.log('Is connected:', isConnected);

  return isConnected;
};

const Controlador = ({ controlador }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [expanded, setExpanded] = useState(false);

  const toggleExpansion = () => setExpanded(!expanded);

  // Use useMemo to calculate the connection status
  const isConnected = useMemo(() => isControllerConnected(controlador), [controlador]);

  // Force re-render every minute to update connection status
  const [, setForceUpdate] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 60000); // Every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <Box mb={2} p={2} bgcolor={colors.primary[400]} borderRadius="8px">
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={3}>
          <Typography variant="h6" color={colors.grey[100]}>
            <Link to="/config" style={{ color: 'inherit', textDecoration: 'none' }}>{controlador.name}</Link>
          </Typography>
        </Grid>
        <Grid item xs={7}>
          <Box display="flex" justifyContent="flex-start">
            <div className={`sensor-container tension ${isConnected ? 'on' : 'off'}`}>
              <img
                src={isConnected ? '/images/sensors/tension.png' : '/images/sensors/notension.png'}
                alt="Conectado"
                style={{ height: '25px' }}
              />
            </div>
            {controlador.last_signal && Object.entries(controlador.config).map(([key, config]) => {
              const sensorName = config.name;
              const sensorValue = controlador.last_signal[sensorName];
              const sensorType = controlador.last_signal[`${sensorName}_type`];
              const colorClass = sensorName.toLowerCase().replace(/\s+/g, '');
              const image_name = sensorName.toLowerCase().replace(/\s+/g, '');

              return (
                <div 
                  key={key} 
                  className={`sensor-container ${sensorValue !== undefined ? (sensorType === 'NA' ? (sensorValue === true ? `on ${colorClass}` : `off ${colorClass}`) : (sensorValue === false ? `on ${colorClass}` : `off ${colorClass}`)) : 'no tension'} ${colorClass}`}
                >
                  <img
                    src={`/images/sensors/${image_name}.png`}
                    alt={sensorName}
                    style={{ height: '25px' }}
                  />
                </div>
              );
            })}
          </Box>
        </Grid>
        <Grid item xs={2}>
          <IconButton onClick={toggleExpansion}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Grid>
      </Grid>
      <Collapse in={expanded}>
        <Typography variant="body2" color={colors.grey[100]} mt={2}>
          Last signal: {controlador.last_signal ? new Date(controlador.last_signal.tstamp).toLocaleString() : 'N/A'}
        </Typography>
        <Typography variant="body2" color={isConnected ? colors.greenAccent[500] : colors.redAccent[500]} mt={1}>
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Collapse>
    </Box>
  );
};

export default React.memo(Controlador);