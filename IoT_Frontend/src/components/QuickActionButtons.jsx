import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import SettingsIcon from '@mui/icons-material/Settings';
import { tokens } from '../theme';
import { DataContext } from '../context/DataContext';

const QuickActionButtons = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { controladores } = useContext(DataContext);

  // Assuming all controllers belong to the same company,
  // we can get the empresa_id from the first controller
  const empresaId = controladores.length > 0 ? controladores[0].empresa_id : '';

  const handleAddController = () => {
    if (empresaId) {
      navigate(`/empresa/${empresaId}/add-controller`);
    } else {
      // Handle the case where there's no empresa_id
      console.error('No empresa ID available');
      // You might want to show an error message to the user here
    }
  };

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="100%"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
        Acciones rápidas
      </Typography>
      <Box display="flex" flexDirection="column" gap="10px">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          style={{ backgroundColor: colors.blueAccent[700], color: colors.grey[100] }}
          onClick={handleAddController}
          disabled={!empresaId}
        >
          Añadir nuevo Controlador
        </Button>
        <Button
          variant="contained"
          startIcon={<WarningIcon />}
          style={{ backgroundColor: colors.redAccent[700], color: colors.grey[100] }}
        >
          Ver todas las Alertas
        </Button>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          style={{ backgroundColor: colors.greenAccent[700], color: colors.grey[100] }}
        >
          System Settings
        </Button>
      </Box>
    </Box>
  );
};

export default QuickActionButtons;