import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import axios from 'axios';
import { Tooltip } from 'react-tooltip';

const UptimeDowntimeChart = ({ controladorId }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/front/controlador/${controladorId}/uptime-downtime`);
        const processedData = processActivityData(response.data.daily_activity);
        setData(processedData);
      } catch (error) {
        console.error('Error fetching uptime/downtime data:', error);
      }
    };

    fetchData();
  }, [controladorId]);

  const processActivityData = (dailyActivity) => {
    const sortedDates = Object.keys(dailyActivity).sort();
    const mostRecentDate = sortedDates[sortedDates.length - 1];
    const currentDate = new Date().toISOString().split('T')[0];

    return Object.entries(dailyActivity).map(([date, activities]) => ({
      date,
      activities: fillGaps(activities, date === currentDate, date === mostRecentDate)
    }));
  };

  const fillGaps = (activities, isCurrentDay, isMostRecentDay) => {
    const filledActivities = [];
    let currentTime = 0;
    const currentMinutes = isCurrentDay ? timeToMinutes(new Date().toTimeString().split(' ')[0]) : 1440;

    activities.forEach((activity) => {
      const startTime = timeToMinutes(activity.start_time);
      if (startTime > currentTime) {
        filledActivities.push({
          start: currentTime,
          end: startTime,
          state: 'off'
        });
      }
      filledActivities.push({
        start: startTime,
        end: timeToMinutes(activity.end_time),
        state: activity.state
      });
      currentTime = timeToMinutes(activity.end_time);
    });

    if (currentTime < currentMinutes) {
      filledActivities.push({
        start: currentTime,
        end: currentMinutes,
        state: 'off'
      });
    }

    return filledActivities;
  };

  const timeToMinutes = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 60 + minutes + seconds / 60;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const barHeight = 30;
  const chartWidth = 800;
  const chartHeight = data.length * (barHeight + 10);
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };

  const renderTimeWindows = (activities, yPosition) => {
    return activities.map((activity, index) => {
      const startX = margin.left + (activity.start / 1440) * (chartWidth - margin.left - margin.right);
      const width = ((activity.end - activity.start) / 1440) * (chartWidth - margin.left - margin.right);
      return (
        <rect
          key={index}
          x={startX}
          y={yPosition}
          width={width}
          height={barHeight}
          fill={activity.state === 'on' ? colors.greenAccent[500] : colors.redAccent[500]}
          data-tooltip-id="chart-tooltip"
          data-tooltip-content={`${minutesToTime(activity.start)} - ${minutesToTime(activity.end)} (${activity.state.toUpperCase()})`}
        />
      );
    });
  };

  return (
    <Box
      bgcolor={colors.primary[400]}
      p={3}
      borderRadius="4px"
      height={chartHeight + margin.top + margin.bottom}
      width={chartWidth + margin.left + margin.right}
    >
      <Typography variant="h5" color={colors.grey[100]} mb={2}>
        Uptime/Downtime Chart
      </Typography>
      <svg width={chartWidth + margin.left + margin.right} height={chartHeight + margin.top + margin.bottom}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {data.map((day, index) => (
            <g key={day.date}>
              {renderTimeWindows(day.activities, index * (barHeight + 10))}
              <text
                x={-10}
                y={index * (barHeight + 10) + barHeight / 2}
                textAnchor="end"
                alignmentBaseline="middle"
                fill={colors.grey[100]}
                fontSize={12}
              >
                {day.date}
              </text>
            </g>
          ))}
          {/* X-axis */}
          <line 
            x1={0} 
            y1={chartHeight} 
            x2={chartWidth - margin.left - margin.right} 
            y2={chartHeight} 
            stroke={colors.grey[100]} 
          />
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
            <g key={hour}>
              <line
                x1={hour * ((chartWidth - margin.left - margin.right) / 24)}
                y1={chartHeight}
                x2={hour * ((chartWidth - margin.left - margin.right) / 24)}
                y2={chartHeight + 5}
                stroke={colors.grey[100]}
              />
              <text
                x={hour * ((chartWidth - margin.left - margin.right) / 24)}
                y={chartHeight + 20}
                textAnchor="middle"
                fill={colors.grey[100]}
                fontSize={12}
              >
                {`${hour.toString().padStart(2, '0')}:00`}
              </text>
            </g>
          ))}
          {/* Y-axis */}
          <line 
            x1={0} 
            y1={0} 
            x2={0} 
            y2={chartHeight} 
            stroke={colors.grey[100]} 
          />
        </g>
      </svg>
      <Tooltip id="chart-tooltip" />
    </Box>
  );
};

export default UptimeDowntimeChart;