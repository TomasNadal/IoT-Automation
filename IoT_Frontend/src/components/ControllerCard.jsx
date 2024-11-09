import React, { useContext, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Avatar, useTheme } from '@mui/material';
import { tokens } from '../theme';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { DataContext } from '../context/DataContext';
import { WebSocketContext } from '../context/WebSocketContext';

const ControllerCard = ({ controller, onUpdateController }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { updateControlador } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);

  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        if (data.controlador_id === controller.id) {
          updateControlador(data);
          if (onUpdateController) {
            onUpdateController(data);
          }
        }
      };

      socket.on("update_controladores", handleUpdate);

      return () => {
        socket.off("update_controladores", handleUpdate);
      };
    }
  }, [socket, controller.id, updateControlador, onUpdateController]);

  const isConnected = (lastSignal) => {
    if (!lastSignal) return false;
    const lastSignalTime = new Date(lastSignal.tstamp).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - lastSignalTime) < 5 * 60 * 1000; // 5 minutes
  };

  const getSensorState = (value, sensorConfig) => {
    // For NA (Normally Open), physical true means ON
    // For NC (Normally Closed), physical true means OFF
    const tipo = sensorConfig?.tipo || 'NA';
    return tipo === 'NA' ? value : !value;
  };

  return (
    <Card sx={{ backgroundColor: colors.primary[400], height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" color={colors.greenAccent[500]}>
            {controller.name}
          </Typography>
          <Chip
            icon={isConnected(controller.last_signal) ? <SignalCellularAltIcon /> : <SignalCellularOffIcon />}
            label={isConnected(controller.last_signal) ? "Conectado" : "Desconectado"}
            color={isConnected(controller.last_signal) ? "success" : "error"}
            size="small"
          />
        </Box>
        <Typography variant="body2" color={colors.grey[100]} mb={1}>
          ID: {controller.id}
        </Typography>
        <Typography variant="body2" color={colors.grey[100]} mb={2}>
          Ultima señal: {controller.last_signal ? new Date(controller.last_signal.tstamp).toLocaleString() : 'N/A'}
        </Typography>
        <Typography variant="body2" color={colors.grey[100]} mb={1}>
          Configuracion del sensor:
        </Typography>
        <Grid container spacing={1}>
          {Object.entries(controller.config).map(([key, value]) => (
            <Grid item xs={6} key={key}>
              <Chip
                avatar={<Avatar>{key.slice(-1)}</Avatar>}
                label={`${value.name} (${value.tipo})`}
                variant="outlined"
                size="small"
                sx={{ width: '100%', justifyContent: 'flex-start' }}
              />
            </Grid>
          ))}
        </Grid>
        {controller.last_signal && (
          <Box mt={2}>
            <Typography variant="body2" color={colors.grey[100]} mb={1}>
              Sensor Status:
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(controller.last_signal)
                .filter(([key]) => key.startsWith('value_sensor'))
                .map(([key, value]) => {
                  const sensorConfig = controller.config[key];
                  const sensorName = sensorConfig ? sensorConfig.name : key;
                  const isOn = getSensorState(value, sensorConfig);
                  
                  return (
                    <Grid item xs={6} key={key}>
                      <Chip
                        label={`${sensorName}: ${isOn ? 'ON' : 'OFF'}`}
                        color={isOn ? "success" : "error"}
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                  );
                })}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ControllerCard;