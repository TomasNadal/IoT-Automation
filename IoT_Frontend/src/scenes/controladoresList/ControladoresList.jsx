import React, { useContext } from 'react';
import { Box } from '@mui/material';
import { DataContext } from '../../context/DataContext';
import Controlador from './Controlador'; // Ensure the correct import path

const ControladoresList = () => {
  const { controladores } = useContext(DataContext);

  return (
    <Box>
      {controladores.map((controlador) => (
        <Controlador key={controlador.id} controlador={controlador} />
      ))}
    </Box>
  );
};

export default ControladoresList;
