import React, { useState, useMemo } from 'react';
import { Box, Typography, Collapse, IconButton, useTheme, Grid, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Link } from "react-router-dom";
import { tokens } from '../../theme';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './ControladoresList.css';

const ChangeItem = ({ change, controlador, colors }) => {
  const getSensorStateText = (value, tipo) => {
    if (tipo === 'NC') {
      return !value ? 'Activado' : 'Desactivado';
    }
    return value ? 'Activado' : 'Desactivado';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        py: 1,
      }}
    >
      <Typography
        sx={{
          minWidth: '75px',
          color: colors.grey[300],
          fontSize: '0.8rem',
          mt: 0.3
        }}
      >
        {format(new Date(change.timestamp), 'HH:mm:ss', { locale: es })}
      </Typography>
      
      <Box sx={{ flex: 1 }}>
        {change.changes.map((sensorChange, idx) => {
          const oldState = getSensorStateText(
            sensorChange.old_value,
            controlador.config[`value_sensor${sensorChange.sensor.slice(-1)}`]?.tipo
          );
          const newState = getSensorStateText(
            sensorChange.new_value,
            controlador.config[`value_sensor${sensorChange.sensor.slice(-1)}`]?.tipo
          );
          
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontSize: '0.85rem', color: colors.grey[100], flex: 1 }}
              >
                {sensorChange.sensor}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ 
                    fontSize: '0.85rem',
                    color: oldState === 'Activado' ? colors.greenAccent[400] : colors.grey[300]
                  }}
                >
                  {oldState}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.85rem', color: colors.grey[300] }}
                >
                  →
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ 
                    fontSize: '0.85rem',
                    color: newState === 'Activado' ? colors.greenAccent[400] : colors.grey[300]
                  }}
                >
                  {newState}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
// Added utility function back
const isControllerConnected = (controller) => {
  if (!controller.last_signal) return false;
  
  const lastSignalTime = new Date(controller.last_signal.tstamp);
  const currentTime = new Date();

  const timeDifference = currentTime.getTime() - lastSignalTime.getTime();
  return timeDifference < 5 * 60 * 1000; // 5 minutes in milliseconds
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

  const changes = useMemo(() => {
    if (!controlador.señales || controlador.señales.length < 2) return [];
    
    const changesList = [];
    for (let i = 1; i < Math.min(11, controlador.señales.length); i++) {
      const currentSignal = controlador.señales[i-1];
      const previousSignal = controlador.señales[i];
      const changes = [];

      for (let j = 1; j <= 6; j++) {
        const sensorKey = `value_sensor${j}`;
        const sensorName = controlador.config[sensorKey]?.name || sensorKey;
        
        if (currentSignal[sensorKey] !== previousSignal[sensorKey]) {
          changes.push({
            sensor: sensorName,
            old_value: previousSignal[sensorKey],
            new_value: currentSignal[sensorKey]
          });
        }
      }

      if (changes.length > 0) {
        changesList.push({
          timestamp: currentSignal.tstamp,
          changes: changes
        });
      }
    }

    return changesList;
  }, [controlador.señales, controlador.config]);

  const getSensorClassName = (sensorName, sensorValue, sensorType, isConnected) => {
    const baseClass = 'sensor-container';
    const colorClass = sensorName.toLowerCase().replace(/\s+/g, '');
    
    if (!isConnected) return `${baseClass} no-tension ${colorClass}`;
    if (sensorValue === undefined) return `${baseClass} no-tension ${colorClass}`;
    
    const isOn = sensorType === 'NA' ? sensorValue : !sensorValue;
    return `${baseClass} ${isOn ? 'on' : 'off'} ${colorClass}`;
  };

  return (
    <Box mb={2} bgcolor={colors.primary[400]} borderRadius="8px">
      <Box p={2}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={3}>
            <Typography variant="h6" color={colors.grey[100]}>
              <Link to={`/controller/${controlador.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {controlador.name}
              </Link>
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
      </Box>

      <Collapse in={expanded}>
        <Box px={2} pb={2}>
          <Typography variant="body2" color={colors.grey[100]}>
            Última señal: {controlador.last_signal ? new Date(controlador.last_signal.tstamp).toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body2" color={isConnected ? colors.greenAccent[500] : colors.redAccent[500]} mt={1}>
            Estado: {isConnected ? 'Conectado' : 'Desconectado'}
          </Typography>

          {changes.length > 0 && (
            <>
              <Divider sx={{ my: 2, borderColor: colors.primary[500] }} />
              <Typography 
                variant="h6" 
                color={colors.grey[100]} 
                sx={{ mb: 2, fontSize: '1rem' }}
              >
                Cambios Recientes ({changes.length})
              </Typography>
              {changes.map((change, index) => (
                <ChangeItem
                  key={index}
                  change={change}
                  controlador={controlador}
                  colors={colors}
                />
              ))}
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default React.memo(Controlador);