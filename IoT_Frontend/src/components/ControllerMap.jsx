import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';

const ControllerMap = ({ controladores }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="400px"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
        Controller Map
      </Typography>
      <Typography color={colors.grey[100]}>
        Map integration would go here. You'll need to use a mapping library like Google Maps or Leaflet.
      </Typography>
      {/* Placeholder for map */}
      <Box
        width="100%"
        height="300px"
        border={`1px solid ${colors.grey[100]}`}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Typography color={colors.grey[100]}>Map Placeholder</Typography>
      </Box>
    </Box>
  );
};

export default ControllerMap;