import React, { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { DataContext } from '../../context/DataContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import { tokens } from '../../theme';
import StatBox from '../../components/StatBox';
import ControllerStatusChart from '../../components/ControllerStatusChart';
import RecentChanges from '../../components/RecentChanges';
import QuickActionButtons from '../../components/QuickActionButtons';
import ResourceUsageGraph from '../../components/ResourceUsageGraph';
import ControllerMap from '../../components/ControllerMap';
import ControladoresList from '../controladoresList/ControladoresList';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WarningIcon from '@mui/icons-material/Warning';
import RecentActivityFeed from '../../components/RecentActivityFeed';
import axios from 'axios';

const isControllerConnected = (controller) => {
  if (!controller.last_signal) return false;
  const lastSignalTime = new Date(controller.last_signal.tstamp).getTime();
  const currentTime = new Date().getTime();
  return (currentTime - lastSignalTime) < 5 * 60 * 1000; // 5 minutes in milliseconds
};

const EnhancedDashboardOverview = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { controladores, connectedStats } = useContext(DataContext);
  const { isConnected } = useContext(WebSocketContext);
  const [allRecentChanges, setAllRecentChanges] = useState([]);

  const calculateStats = useCallback(() => {
    const totalControllers = controladores.length;
    const connectedControllers = controladores.filter(isControllerConnected).length;
    const disconnectedControllers = totalControllers - connectedControllers;
    const activeAlerts = disconnectedControllers;

    return {
      totalControllers,
      connectedControllers,
      disconnectedControllers,
      activeAlerts
    };
  }, [controladores]);

  const stats = useMemo(() => calculateStats(), [calculateStats]);

  useEffect(() => {
    const fetchAllRecentChanges = async () => {
      try {
        const changesPromises = controladores.map(controlador => 
          axios.get(`http://localhost:5000/front/controlador/${controlador.id}/changes`)
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
              sensor: sensorNameMap[c.sensor] || c.sensor // Use mapped name if available, otherwise use original
            }))
          }));
        });

        // Sort all changes by timestamp, most recent first
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
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatBox
            title={stats.totalControllers.toString()}
            subtitle="Total Controllers"
            progress="1"
            increase={`${stats.totalControllers}`}
            icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatBox
            title={stats.connectedControllers.toString()}
            subtitle="Connected Controllers"
            progress={stats.totalControllers > 0 ? stats.connectedControllers / stats.totalControllers : 0}
            increase={`${Math.round((stats.connectedControllers / stats.totalControllers) * 100)}%`}
            icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatBox
            title={stats.activeAlerts.toString()}
            subtitle="Active Alerts"
            progress={stats.totalControllers > 0 ? stats.activeAlerts / stats.totalControllers : 0}
            increase={`${Math.round((stats.activeAlerts / stats.totalControllers) * 100)}%`}
            icon={<WarningIcon sx={{ color: colors.redAccent[600], fontSize: "26px" }} />}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <ControllerStatusChart 
            connected={stats.connectedControllers} 
            disconnected={stats.disconnectedControllers} 
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentChanges changes={allRecentChanges} />
        </Grid>



        <Grid item xs={12}>
          <Box
            backgroundColor={colors.primary[400]}
            borderRadius="4px"
            height="400px"
            overflow="auto"
          >
            <ControladoresList />
          </Box>
        </Grid>

        {/* Row 3: Additional Components */}
        <Grid item xs={12} md={4}>
          <QuickActionButtons />
        </Grid>
        <Grid item xs={12} md={8}>
          <ResourceUsageGraph controladores={controladores} />
        </Grid>

        {/* Row 4: Map */}
        <Grid item xs={12}>
          <ControllerMap controladores={controladores} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedDashboardOverview;