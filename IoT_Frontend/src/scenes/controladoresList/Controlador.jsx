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

  const timeDifference = currentTime.getTime() - lastSignalTime.getTime();
  return timeDifference < 5 * 60 * 1000;
};

const Controlador = ({ controlador }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [expanded, setExpanded] = useState(false);

  const toggleExpansion = () => setExpanded(!expanded);

  const isConnected = useMemo(() => isControllerConnected(controlador), [controlador]);

  const [, setForceUpdate] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getSensorClassName = (sensorName, sensorValue, sensorType, isConnected) => {
    const baseClass = 'sensor-container';
    const colorClass = sensorName.toLowerCase().replace(/\s+/g, '');
    
    if (!isConnected) return `${baseClass} no-tension ${colorClass}`;
    
    if (sensorValue === undefined) return `${baseClass} no-tension ${colorClass}`;
    
    const isOn = sensorType === 'NA' ? sensorValue : !sensorValue;
    return `${baseClass} ${isOn ? 'on' : 'off'} ${colorClass}`;
  };

  return (
    <Box mb={2} p={2} bgcolor={colors.primary[400]} borderRadius="8px">
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={3}>
          <Typography variant="h6" color={colors.grey[100]}>
            <Link to={`/controller/${controlador.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{controlador.name}</Link>
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
            {Object.entries(controlador.config).map(([key, config]) => {
              const sensorName = config.name;
              const sensorValue = isConnected ? controlador.last_signal?.[key] : undefined;
              const sensorType = config.tipo;
              const imageName = sensorName.toLowerCase().replace(/\s+/g, '');

              console.log(`Sensor ${sensorName}:`, { value: sensorValue, type: sensorType, connected: isConnected });

              return (
                <div 
                  key={key} 
                  className={getSensorClassName(sensorName, sensorValue, sensorType, isConnected)}
                >
                  <img
                    src={`/images/sensors/${imageName}.png`}
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