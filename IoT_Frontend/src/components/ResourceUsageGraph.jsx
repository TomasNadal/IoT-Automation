import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tokens } from '../theme';

const ResourceUsageGraph = ({ controladores }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // This is a placeholder. You'll need to replace this with actual resource usage data
  const data = controladores.map((c, index) => ({
    name: c.name,
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
  }));

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="100%"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
        Resource Usage
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="cpu" stackId="1" stroke={colors.blueAccent[500]} fill={colors.blueAccent[800]} />
          <Area type="monotone" dataKey="memory" stackId="1" stroke={colors.greenAccent[500]} fill={colors.greenAccent[800]} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ResourceUsageGraph;