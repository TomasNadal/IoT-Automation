import React, { useContext, useMemo, useCallback } from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { DataContext } from '../../context/DataContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import { tokens } from '../../theme';
import StatBox from '../../components/StatBox';
import ControllerStatusChart from '../../components/ControllerStatusChart';
import RecentActivityFeed from '../../components/RecentActivityFeed';
import QuickActionButtons from '../../components/QuickActionButtons';
import ResourceUsageGraph from '../../components/ResourceUsageGraph';
import ControllerMap from '../../components/ControllerMap';
import ControladoresList from '../controladoresList/ControladoresList';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import SensorsIcon from '@mui/icons-material/Sensors';
import WarningIcon from '@mui/icons-material/Warning';

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

  const calculateStats = useCallback(() => {
    const totalControllers = controladores.length;
    const connectedControllers = controladores.filter(isControllerConnected).length;
    const disconnectedControllers = totalControllers - connectedControllers;
    const totalSensors = controladores.reduce((acc, controlador) => 
      acc + Object.keys(controlador.config || {}).length, 0);
    const activeAlerts = disconnectedControllers; // Consider disconnected controllers as active alerts

    return {
      totalControllers,
      connectedControllers,
      disconnectedControllers,
      totalSensors,
      activeAlerts
    };
  }, [controladores]);

  const stats = useMemo(() => calculateStats(), [calculateStats]);

  console.log('Current stats:', stats);

  return (
    <Box m="20px">
      <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
          <StatBox
            title={stats.totalControllers.toString()}
            subtitle="Total Controllers"
            progress="1"
            increase={`${stats.totalControllers}`}
            icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatBox
            title={stats.connectedControllers.toString()}
            subtitle="Connected Controllers"
            progress={stats.totalControllers > 0 ? stats.connectedControllers / stats.totalControllers : 0}
            increase={`${Math.round((stats.connectedControllers / stats.totalControllers) * 100)}%`}
            icon={<ElectricBoltIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatBox
            title={stats.totalSensors.toString()}
            subtitle="Total Sensors"
            progress={stats.totalSensors > 0 ? 1 : 0}
            increase={`${stats.totalSensors}`}
            icon={<SensorsIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
          <RecentActivityFeed controladores={controladores} />
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