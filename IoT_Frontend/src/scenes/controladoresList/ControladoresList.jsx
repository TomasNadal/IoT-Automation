// src/scenes/controladoresList/ControladoresList.jsx
import React, { useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import Controlador from './Controlador';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';

const ControladoresList = () => {
  const { controladores } = useContext(DataContext);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box>
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} p="15px">
        Lista de controladores
      </Typography>
      {controladores.map((controlador) => (
        <Controlador key={controlador.id} controlador={controlador} />
      ))}
    </Box>
  );
};

export default ControladoresList;