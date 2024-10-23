import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { ResponsiveHeatMap } from '@nivo/heatmap';

const MachineActivityTimeline = ({ dailyActivity }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const processData = (activityData) => {
    return Object.entries(activityData).map(([date, activities]) => {
      const hourlyData = {};
      for (let i = 0; i < 24; i++) {
        const hourStart = i * 12;
        const hourEnd = (i + 1) * 12;
        const hourActivities = activities.slice(hourStart, hourEnd);
        const onCount = hourActivities.filter(status => status === 'on').length;
        hourlyData[`hour-${i}`] = onCount / 12;  // Percentage of 'on' time
      }
      return {
        date,
        ...hourlyData
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));  // Sort by date, most recent first
  };

  const data = processData(dailyActivity);

  return (
    <Box height={400}>
      <Typography variant="h5" mb={2}>Machine Activity Timeline</Typography>
      <ResponsiveHeatMap
        data={data}
        keys={[...Array(24).keys()].map(i => `hour-${i}`)}
        indexBy="date"
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        forceSquare={true}
        axisTop={{
          orient: 'top',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -90,
          legend: 'Hour of Day',
          legendOffset: 46
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
          legendOffset: -72
        }}
        cellOpacity={1}
        colors={{
          type: 'sequential',
          scheme: 'greens'
        }}
        emptyColor="#ff0000"
        cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
        hoverTarget="cell"
        cellHoverOthersOpacity={0.25}
        cellHoverOpacity={1}
        animate={false}
        motionConfig="wobbly"
        isInteractive={true}
        cellComponent={({ data, x, y, width, height, color }) => (
          <g transform={`translate(${x}, ${y})`}>
            <rect
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
              fill={data.data.format === 100 ? colors.greenAccent[500] : color}
              strokeWidth={0}
            />
          </g>
        )}
        tooltip={({ xKey, yKey, value }) => (
          <strong style={{ color: theme.palette.text.primary }}>
            {yKey} - {xKey.replace('hour-', '')}: {Math.round(value * 100)}% active
          </strong>
        )}
      />
    </Box>
  );
};

export default MachineActivityTimeline;