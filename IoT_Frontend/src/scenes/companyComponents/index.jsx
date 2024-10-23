import React, { useContext, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, Chip, Avatar } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import LoadingScreen from '../../components/LoadingScreen';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { DataContext } from '../../context/DataContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import { Link } from 'react-router-dom';  // Add this import at the top


const CompanyComponents = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { controladores, isLoading, error } = useContext(DataContext);
  const { isConnected } = useContext(WebSocketContext);

  const isControllerConnected = (component) => {
    if (!component.last_signal && (!component.señales || component.señales.length === 0)) return false;
    const lastSignal = component.last_signal || component.señales[0];
    const lastSignalTime = new Date(lastSignal.tstamp).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - lastSignalTime) < 5 * 60 * 1000; // 5 minutes
  };

  if (isLoading) return <LoadingScreen />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box m="20px">
      <Header 
        title="Controladores" 
        subtitle={
          <Box display="flex" alignItems="center" gap={1}>
            <span>Vista general de todos los controladores</span>
            <Chip
              size="small"
              icon={isConnected ? <SignalCellularAltIcon /> : <SignalCellularOffIcon />}
              label={isConnected ? "Conectado al servidor" : "Desconectado"}
              color={isConnected ? "success" : "error"}
            />
          </Box>
        }
      />

      <Grid container spacing={3}>
        {controladores.map((component) => {
          const lastSignal = component.last_signal || (component.señales && component.señales[0]);
          const isConnected = isControllerConnected(component);

          return (
            <Grid item xs={12} sm={6} md={4} key={component.id}>
              <Card 
                sx={{ 
                  backgroundColor: colors.primary[400], 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography 
                    variant="h5" 
                    color={colors.greenAccent[500]}
                    component={Link}
                    to={`/controller/${component.id}`}
                    sx={{
                      textDecoration: 'none',
                      '&:hover': {
                        color: colors.greenAccent[400],
                        textDecoration: 'underline'
                      },
                      cursor: 'pointer',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {component.name}
                  </Typography>
                  <Chip
                    icon={isConnected ? <SignalCellularAltIcon /> : <SignalCellularOffIcon />}
                    label={isConnected ? "Connected" : "Disconnected"}
                    color={isConnected ? "success" : "error"}
                    size="small"
                  />
                </Box>

                  <Typography variant="body2" color={colors.grey[100]} mb={1}>
                    ID: {component.id}
                  </Typography>

                  <Typography variant="body2" color={colors.grey[100]} mb={2}>
                    Last Signal: {lastSignal ? new Date(lastSignal.tstamp).toLocaleString() : 'N/A'}
                  </Typography>

                  {component.config && (
                    <>
                      <Typography variant="body2" color={colors.grey[100]} mb={1}>
                        Sensor Configuration:
                      </Typography>
                      <Grid container spacing={1} mb={2}>
                        {Object.entries(component.config).map(([key, value]) => (
                          <Grid item xs={6} key={key}>
                            <Chip
                              avatar={<Avatar>{key.slice(-1)}</Avatar>}
                              label={`${value.name} (${value.tipo})`}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                width: '100%', 
                                justifyContent: 'flex-start',
                                backgroundColor: colors.primary[500]
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}

                  {lastSignal && (
                    <Box mt={2}>
                      <Typography variant="body2" color={colors.grey[100]} mb={1}>
                        Sensor Status:
                      </Typography>
                      <Grid container spacing={1}>
                        {Object.entries(lastSignal)
                          .filter(([key]) => key.startsWith('value_sensor'))
                          .map(([key, value]) => {
                            const sensorConfig = component.config[key];
                            const sensorName = sensorConfig ? sensorConfig.name : key;
                            return (
                              <Grid item xs={6} key={key}>
                                <Chip
                                  label={`${sensorName}: ${value ? 'ON' : 'OFF'}`}
                                  color={value ? "success" : "error"}
                                  size="small"
                                  sx={{ 
                                    width: '100%',
                                    backgroundColor: value ? colors.greenAccent[700] : colors.redAccent[700]
                                  }}
                                />
                              </Grid>
                            );
                          })}
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CompanyComponents;