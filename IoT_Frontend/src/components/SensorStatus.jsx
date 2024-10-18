// src/components/SensorStatus.jsx
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';

const SensorStatus = ({ name, value, type }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isActive = type === 'NA' ? !value : value;

  return (
    <Box 
      p={2} 
      bgcolor={isActive ? colors.greenAccent[700] : colors.redAccent[700]} 
      borderRadius="4px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <Typography variant="body1" color={colors.grey[100]}>{name}</Typography>
      <Box
        bgcolor={isActive ? colors.greenAccent[500] : colors.redAccent[500]}
        borderRadius="50%"
        width={12}
        height={12}
      />
    </Box>
  );
};

export default SensorStatus;