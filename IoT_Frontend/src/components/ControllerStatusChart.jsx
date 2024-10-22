import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { tokens } from '../theme';
const ControllerStatusChart = ({ connected, disconnected }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const data = [
    { name: 'Conectado', value: connected, color: colors.greenAccent[500] },
    { name: 'Desconectado', value: disconnected, color: colors.redAccent[500] },
  ];

  console.log('ControllerStatusChart data:', data); // Add this log

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="100%"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
        Status Controladores
      </Typography>
      <PieChart width={400} height={300}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </Box>
  );
};

export default ControllerStatusChart;