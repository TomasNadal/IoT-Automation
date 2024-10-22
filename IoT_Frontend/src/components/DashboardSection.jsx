import React from 'react';
import { Box, Grid, useTheme } from '@mui/material';
import { tokens } from '../theme';
import StatBox from './StatBox';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WarningIcon from '@mui/icons-material/Warning';

const DashboardSection = ({ stats }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Grid 
      container 
      spacing={3}
      sx={{
        '& > .MuiGrid-item': {
          maxWidth: '100%',
        }
      }}
    >
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
          p={2}
          borderRadius="4px"
          width="100%"
        >
          <StatBox
            title={stats.activeAlerts.toString()}
            subtitle="Alertas Activas"
            progress={stats.totalControllers > 0 ? stats.activeAlerts / stats.totalControllers : 0}
            increase={`${Math.round((stats.activeAlerts / stats.totalControllers) * 100)}%`}
            icon={<WarningIcon sx={{ color: colors.redAccent[600], fontSize: "26px" }} />}
          />
        </Box>
      </Grid>
    </Grid>
  );
};

export default DashboardSection;