import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Link } from "react-router-dom";
import { tokens } from '../../theme';
import './ControladoresList.css';  // Or a separate CSS file if needed

const Controlador = ({ controlador }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [expandedControlador, setExpandedControlador] = useState(null);

  const toggleExpansion = (id) => {
    setExpandedControlador((prevId) => (prevId === id ? null : id));
  };

  return (
    <Box mb={2} p={2} bgcolor={colors.primary[400]} borderRadius="8px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h3" color={colors.grey[100]}>
          <Link to="/config">{controlador.name}</Link>
        </Typography>
        <Box display="flex">
          <div className={`sensor-container tension ${controlador.connected ? 'on' : 'off'}`}>
            <img
              src={controlador.connected
                ? '/images/sensors/tension.png'
                : '/images/sensors/notension.png'}
              alt="Conectado"
              style={{ height: '25px' }}
            />
          </div>
          {controlador.last_signal ? (
            Object.entries(controlador.config).map(([key, config]) => {
              const sensorName = config.name;
              const sensorValue = controlador.last_signal[sensorName];
              const sensorType = controlador.last_signal[`${sensorName}_type`];
              const colorClass = sensorName.toLowerCase().replace(/\s+/g, '');
              const image_name = sensorName.toLowerCase().replace(/\s+/g, '');

              return (
                <div className={`sensor-container ${sensorValue !== undefined ? (sensorType === 'NA' ? (sensorValue === true ? `on ${colorClass}` : `off ${colorClass}`) : (sensorValue === false ? `on ${colorClass}` : `off ${colorClass}`)) : 'no tension'} ${colorClass}`} key={key}>
                  <img
                    src={`/images/sensors/${image_name}.png`}
                    alt={sensorName}
                    style={{ height: '25px' }}
                  />
                </div>
              );
            })
          ) : (
            <Typography variant="body2" color="red">
              No hay última señal disponible.
            </Typography>
          )}
          <div className={`sensor-container`}>
            {/*<SensorTimeCounter controladorId={controlador.id} sensorName={'Marcha'} />*/}
          </div>
        </Box>
        <IconButton onClick={() => toggleExpansion(controlador.id)}>
          {expandedControlador === controlador.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expandedControlador === controlador.id}>
        <Typography variant="body1" color={colors.grey[100]}>
          Información adicional sobre el controlador.
        </Typography>

      </Collapse>
    </Box>
  );
};

export default Controlador;
