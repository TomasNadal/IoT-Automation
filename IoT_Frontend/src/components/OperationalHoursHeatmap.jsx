// src/components/OperationalHoursHeatmap.jsx
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveHeatMap } from '@nivo/heatmap';

const OperationalHoursHeatmap = ({ heatmapData, sensorConfig }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const processData = (data) => {
    if (!data || Object.keys(data).length === 0) {
      return [];
    }
    return Object.entries(data).map(([date, hours]) => ({
      date,
      ...Object.fromEntries(hours.map((value, index) => [`hour-${index}`, value]))
    }));
  };

  const chartData = processData(heatmapData);

  if (chartData.length === 0) {
    return (
      <Box height={400} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="h6">No data available for heatmap</Typography>
      </Box>
    );
  }

  return (
    <Box height={400}>
      <Typography variant="h5" mb={2}>Operational Hours Heatmap</Typography>
      <ResponsiveHeatMap
        data={chartData}
        keys={Array(24).fill().map((_, i) => `hour-${i}`)}
        indexBy="date"
        margin={{ top: 60, right: 60, bottom: 60, left: 60 }}
        forceSquare={true}
        axisTop={{
          orient: 'top',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -90,
          legend: 'Hour',
          legendOffset: 36
        }}
        axisRight={null}
        axisBottom={null}
        axisLeft={{
          orient: 'left',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Date',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        cellOpacity={1}
        colors={{
          type: 'sequential',
          scheme: 'greens'
        }}
        cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
        hoverTarget="cell"
        cellHoverOthersOpacity={0.25}
      />
    </Box>
  );
};

export default OperationalHoursHeatmap;