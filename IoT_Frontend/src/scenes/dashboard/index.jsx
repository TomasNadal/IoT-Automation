import React, { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Grid, useTheme } from '@mui/material';
import { DataContext } from '../../context/DataContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import { tokens } from '../../theme';
import StatBox from '../../components/StatBox';
import ControllerStatusChart from '../../components/ControllerStatusChart';
import RecentChanges from '../../components/RecentChanges';
import DashboardSection from '../../components/DashboardSection';
import QuickActionButtons from '../../components/QuickActionButtons';
import ResourceUsageGraph from '../../components/ResourceUsageGraph';
import ControllerMap from '../../components/ControllerMap';
import ControladoresList from '../controladoresList/ControladoresList';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';
import { Link } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const isControllerConnected = (controller) => {
  if (!controller.last_signal) return false;
  const lastSignalTime = new Date(controller.last_signal.tstamp).getTime();
  const currentTime = new Date().getTime();
  return (currentTime - lastSignalTime) < 5 * 60 * 1000;
};

const EnhancedDashboardOverview = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { controladores } = useContext(DataContext);
  const { isConnected } = useContext(WebSocketContext);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [allRecentChanges, setAllRecentChanges] = useState([]);


  useEffect(() => {
    const fetchTriggeredAlerts = async () => {
      try {
        const alertLogPromises = controladores.map(controller =>
          axios.get(`https://calm-awfully-shrew.ngrok-free.app/alerts/controlador/${controller.id}/alert-logs`, {
            params: {
              // Get recent logs, for example last 5 minutes
              limit: 100
            },
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          })
        );
        
        const responses = await Promise.all(alertLogPromises);
        const recentLogs = responses.flatMap(response => response.data?.logs || []);
        
        // Group by alert ID to avoid counting the same alert multiple times
        const activeAlertGroups = recentLogs.reduce((groups, log) => {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const logTime = new Date(log.triggered_at);
          
          // Only count alerts from the last 5 minutes
          if (logTime > fiveMinutesAgo) {
            if (!groups[log.aviso_id]) {
              groups[log.aviso_id] = {
                ...log,
                count: 1,
                latestTrigger: logTime
              };
            } else if (logTime > new Date(groups[log.aviso_id].latestTrigger)) {
              groups[log.aviso_id].latestTrigger = logTime;
              groups[log.aviso_id].count++;
            }
          }
          return groups;
        }, {});

        setTriggeredAlerts(Object.values(activeAlertGroups));
      } catch (error) {
        console.error('Error fetching alert logs:', error);
      }
    };

    fetchTriggeredAlerts();
    
    // Set up a polling interval to refresh triggered alerts
    const intervalId = setInterval(fetchTriggeredAlerts, 30000); // Poll every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [controladores]);


  

  // Calculate stats with active alerts
  const calculateStats = useCallback(() => {
    const totalControllers = controladores.length;
    const connectedControllers = controladores.filter(isControllerConnected).length;
    const disconnectedControllers = totalControllers - connectedControllers;
    
    return {
      totalControllers,
      connectedControllers,
      disconnectedControllers,
      activeAlertsCount: triggeredAlerts.length
    };
  }, [controladores, triggeredAlerts]);

  const stats = useMemo(() => calculateStats(), [calculateStats]);

  useEffect(() => {
    const fetchAllRecentChanges = async () => {
      try {
        const changesPromises = controladores.map(controlador => 
          axios.get(`https://calm-awfully-shrew.ngrok-free.app/front/controlador/${controlador.id}/changes`, {
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          })
        );
        const responses = await Promise.all(changesPromises);
        
        const allChanges = responses.flatMap((response, index) => {
          const controlador = controladores[index];
          const sensorNameMap = Object.entries(controlador.config).reduce((acc, [key, value]) => {
            acc[key] = value.name;
            return acc;
          }, {});

          return response.data.map(change => ({
            ...change,
            controladorId: controlador.id,
            controladorName: controlador.name,
            changes: change.changes.map(c => ({
              ...c,
              sensor: sensorNameMap[c.sensor] || c.sensor
            }))
          }));
        });

        allChanges.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAllRecentChanges(allChanges);
      } catch (error) {
        console.error('Error fetching recent changes:', error);
      }
    };

    fetchAllRecentChanges();
  }, [controladores]);

  return (
    <Box m="20px">

      <Grid 
        container 
        spacing={3}
        sx={{
          '& > .MuiGrid-item': {
            maxWidth: '100%',
          }
        }}
      >
        {/* Stats Section */}
        <Grid item xs={12} sm={6} md={4}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            width="100%"
          >
            <StatBox
              title={stats.totalControllers.toString()}
              subtitle="Controladores totales"
              progress="1"
              increase={`${stats.totalControllers}`}
              icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            width="100%"
          >
            <StatBox
              title={stats.connectedControllers.toString()}
              subtitle="Controladores Conectados"
              progress={stats.totalControllers > 0 ? stats.connectedControllers / stats.totalControllers : 0}
              increase={`${Math.round((stats.connectedControllers / stats.totalControllers) * 100)}%`}
              icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box
            backgroundColor={colors.primary[400]}
            display="block"
            p={2}
            borderRadius="4px"
            width="100%"
            height="100%"
            component={Link}
            to="/alerts"
            sx={{
              textDecoration: 'none',
              transition: 'transform 0.2s',
              boxShadow: `0px 2px 4px -1px ${colors.primary[900]}`,
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0px 4px 8px -2px ${colors.primary[900]}`,
              },
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.1)',
                },
                '100%': {
                  transform: 'scale(1)',
                },
              },
            }}
          >
            <StatBox
              title={stats.activeAlertsCount.toString()}
              subtitle="Alertas Activas"
              progress={stats.totalControllers > 0 ? stats.activeAlertsCount / stats.totalControllers : 0}
              increase={triggeredAlerts.length > 0 ? 
                `${triggeredAlerts.reduce((sum, alert) => sum + alert.count, 0)} activaciones` : 
                'Sin alertas activas'}
              icon={
                <NotificationsActiveIcon 
                  sx={{ 
                    color: colors.redAccent[600], 
                    fontSize: "26px",
                    animation: triggeredAlerts.length > 0 ? 'pulse 2s infinite' : 'none'
                  }} 
                />
              }
            />
          </Box>
        </Grid>

        {/* Charts Section */}
        <Grid item xs={12} md={8}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            width="100%"
            height="100%"
          >
            <ControllerStatusChart 
              connected={stats.connectedControllers} 
              disconnected={stats.disconnectedControllers} 
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            width="100%"
            height="100%"
            overflow="auto"
          >
            <RecentChanges changes={allRecentChanges} />
          </Box>
        </Grid>

        {/* Controllers List Section */}
        <Grid item xs={12}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            height="400px"
            overflow="auto"
            width="100%"
          >
            <ControladoresList />
          </Box>
        </Grid>

        {/* Additional Components Section */}
        <Grid item xs={12} md={4}>
          <Box
            backgroundColor={colors.primary[400]}
            p={2}
            borderRadius="4px"
            width="100%"
            height="100%"
          >
            <QuickActionButtons />
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
};

export default EnhancedDashboardOverview;