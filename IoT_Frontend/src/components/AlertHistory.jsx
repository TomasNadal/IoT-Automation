import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  useTheme, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Collapse,
} from '@mui/material';
import { tokens } from '../theme';
import axios from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import config from '../config/config';
import { WebSocketContext } from '../context/WebSocketContext';

const AlertHistory = ({ controladorId }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [alertLogs, setAlertLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const { socket } = useContext(WebSocketContext);

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    
    const diff = new Date(end) - new Date(start);
    if (diff < 0) {
      console.warn('Negative duration detected:', { start, end });
      return 'N/A';
    }
  
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} días${hours % 24 > 0 ? ` ${hours % 24} h` : ''}`;
    if (hours > 0) return `${hours} h${minutes % 60 > 0 ? ` ${minutes % 60} min` : ''}`;
    if (minutes === 0) return '< 1 min';
    return `${minutes} min`;
  };

  const determineResolutionReason = (log) => {
    if (!log.resolved) return null;
    if (log.old_value === log.new_value) {
      return 'Sensor volvió a estado normal';
    }
    return 'Condición de alerta ya no presente';
  };

  const processAlertLogs = useCallback((logs) => {
    if (!Array.isArray(logs)) return [];
  
    const alertGroups = {};
    
    logs.forEach(log => {
      if (!log || !log.aviso_id) return;
  
      const alertId = log.aviso_id;
      if (!alertGroups[alertId]) {
        alertGroups[alertId] = {
          ...log,
          history: [],
          isActive: false
        };
      }
      
      // Enhance log with additional context
      const enhancedLog = {
        ...log,
        resolution_reason: log.resolved ? determineResolutionReason(log) : null
      };
      
      alertGroups[alertId].history.push(enhancedLog);
      
      // Sort history by timestamp in descending order (newest first)
      alertGroups[alertId].history.sort((a, b) => 
        new Date(b.triggered_at) - new Date(a.triggered_at)
      );
  
      const mostRecent = alertGroups[alertId].history[0];
      if (mostRecent) {
        alertGroups[alertId].isActive = !mostRecent.resolved;
        alertGroups[alertId].resolved_at = mostRecent.resolved ? mostRecent.resolved_at : null;
      }
    });
  
    // Sort alert groups by most recent activity
    return Object.values(alertGroups)
      .sort((a, b) => new Date(b.history[0]?.triggered_at) - new Date(a.history[0]?.triggered_at));
  }, []);

  const fetchAlertLogs = useCallback(async () => {
    if (!controladorId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${config.apiUrl}/alerts/controlador/${controladorId}/alert-logs`,
        {
          params: {
            limit: 100
          }
        }
      );

      if (response.data && response.data.logs) {
        const processedLogs = processAlertLogs(response.data.logs);
        setAlertLogs(processedLogs);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching alert logs:', error);
      setError('Error loading alert history');
    } finally {
      setLoading(false);
    }
  }, [controladorId, processAlertLogs]);

  useEffect(() => {
    fetchAlertLogs();
    const intervalId = setInterval(fetchAlertLogs, 30000);
    return () => clearInterval(intervalId);
  }, [fetchAlertLogs]);

  useEffect(() => {
    if (!socket) return;

    const handleAlertTriggered = (data) => {
      console.log('Alert triggered:', data);
      if (data.controlador_id === controladorId) {
        const newLog = {
          id: data.log.id,
          aviso_id: data.alert.id,
          name: data.alert.name,
          sensor_name: data.log.sensor_name,
          triggered_at: data.log.triggered_at,
          old_value: data.log.old_value,
          new_value: data.log.new_value,
          resolved: false
        };

        setAlertLogs(prevLogs => {
          const updatedLogs = processAlertLogs([newLog, ...prevLogs]);
          return updatedLogs;
        });
      }
    };

    const handleAlertResolved = (data) => {
      console.log('Alert resolved:', data);
      if (data.controlador_id === controladorId) {
        setAlertLogs(prevLogs => {
          const updatedLogs = prevLogs.map(log => {
            if (log.aviso_id === data.alert.id && log.isActive) {
              return {
                ...log,
                resolved: true,
                resolved_at: data.log.resolved_at,
                isActive: false,
                history: [
                  {
                    ...data.log,
                    triggered_at: data.log.resolved_at,
                    resolution_reason: determineResolutionReason(data.log)
                  },
                  ...log.history
                ]
              };
            }
            return log;
          });
          return updatedLogs;
        });
      }
    };

    socket.on('alert_triggered', handleAlertTriggered);
    socket.on('alert_resolved', handleAlertResolved);

    return () => {
      socket.off('alert_triggered', handleAlertTriggered);
      socket.off('alert_resolved', handleAlertResolved);
    };
  }, [socket, controladorId, processAlertLogs]);

  const toggleRowExpansion = (alertId) => {
    setExpandedRows(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" p={2}>
        {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" mb={2} color={colors.grey[100]}>
        Historial de Alertas
      </Typography>

      <TableContainer component={Paper} sx={{ backgroundColor: colors.primary[400] }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: colors.greenAccent[500] }}></TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Alerta</TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Sensor</TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Estado</TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Activación</TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Resolución</TableCell>
              <TableCell sx={{ color: colors.greenAccent[500] }}>Duración</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertLogs.map((alertGroup) => {
              const isExpanded = expandedRows[alertGroup.id];
              const latestLog = alertGroup.history[0];
              
              return (
                <React.Fragment key={alertGroup.id}>
                  {/* Main Row */}
                  <TableRow 
                    sx={{ 
                      '& > *': { borderBottom: 'unset' },
                      backgroundColor: alertGroup.isActive ? 
                        `${colors.redAccent[700]}20` : 
                        'transparent'
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(alertGroup.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100] }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {alertGroup.isActive ? 
                          <ErrorIcon sx={{ color: colors.redAccent[500] }} /> :
                          <CheckCircleIcon sx={{ color: colors.greenAccent[500] }} />
                        }
                        {alertGroup.name || 'N/A'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100] }}>
                      {alertGroup.sensor_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alertGroup.isActive ? 'Activa' : 'Resuelta'}
                        color={alertGroup.isActive ? 'error' : 'success'}
                        size="small"
                        sx={{ minWidth: '80px' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100] }}>
                      {latestLog?.triggered_at ? 
                        new Date(latestLog.triggered_at).toLocaleString() : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100] }}>
                      {alertGroup.resolved_at ? 
                        new Date(alertGroup.resolved_at).toLocaleString() : 
                        alertGroup.isActive ? 'Pendiente' : 'N/A'
                      }
                    </TableCell>
                    <TableCell sx={{ color: colors.grey[100] }}>
                      {alertGroup.resolved_at && latestLog?.triggered_at ?
                        formatDuration(latestLog.triggered_at, alertGroup.resolved_at) :
                        alertGroup.isActive ? 'En curso' : 'N/A'
                      }
                    </TableCell>
                  </TableRow>

                  {/* Expanded History */}
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box p={3} bgcolor={colors.primary[500]} borderRadius={1} m={1}>
                          <Typography variant="h6" gutterBottom component="div" color={colors.greenAccent[500]}>
                            Historial de Cambios
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: colors.grey[100] }}>Fecha</TableCell>
                                <TableCell sx={{ color: colors.grey[100] }}>Evento</TableCell>
                                <TableCell sx={{ color: colors.grey[100] }}>Cambio</TableCell>
                                <TableCell sx={{ color: colors.grey[100] }}>Duración</TableCell>
                                <TableCell sx={{ color: colors.grey[100] }}>Detalles</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                            {alertGroup.history.map((log, index) => {
                                // Calculate duration by comparing with the PREVIOUS event (since we're showing newest first)
                                const prevLog = alertGroup.history[index + 1];
                                const duration = prevLog 
                                  ? formatDuration(prevLog.triggered_at, log.triggered_at)  // Note the order change here
                                  : log.resolved 
                                    ? formatDuration(log.triggered_at, log.resolved_at)
                                    : 'En curso';

                                return (
                                  <TableRow key={index}>
                                    <TableCell sx={{ color: colors.grey[300] }}>
                                      {new Date(log.triggered_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={log.resolved ? 'Resuelta' : 'Activada'}
                                        size="small"
                                        color={log.resolved ? 'success' : 'warning'}
                                        sx={{ minWidth: '80px' }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography 
                                        sx={{ 
                                          color: log.new_value ? colors.greenAccent[500] : colors.redAccent[500],
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {log.old_value ? 'ON' : 'OFF'} → {log.new_value ? 'ON' : 'OFF'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: colors.grey[300] }}>
                                      {duration}
                                    </TableCell>
                                    <TableCell sx={{ color: colors.grey[300] }}>
                                      {log.resolution_reason || '-'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            {alertLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', color: colors.grey[100] }}>
                  No hay historial de alertas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AlertHistory;