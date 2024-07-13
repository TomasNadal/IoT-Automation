import React, { useContext } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import StatBox from '../../components/StatBox';  // Componente para mostrar estadísticas
import { tokens } from '../../theme';  // Para obtener colores
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';  // Cambia el ícono según tu necesidad
import { DataContext } from '../../context/DataContext';

const ControladoresStats = () => {
  const { connectedStats } = useContext(DataContext);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      gridColumn="span 3"
      backgroundColor={colors.primary[400]}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <StatBox
        title={`${connectedStats.connected} Conectados`}
        subtitle={`${connectedStats.disconnected} Desconectados`}  // Muestra cuántos están desconectados
        progress={`${connectedStats.connected / (connectedStats.connected + connectedStats.disconnected)}`}  // Calcula el progreso como porcentaje
        increase={`${Math.round((connectedStats.connected / (connectedStats.connected + connectedStats.disconnected)) * 100)}%`}  // Muestra como porcentaje
        icon={
          <ElectricBoltIcon  // Cambia este ícono por uno más adecuado para controladores
            sx={{ color: colors.greenAccent[600], fontSize: "26px" }}
          />
        }
      />
    </Box>
  );
};

export default ControladoresStats;
