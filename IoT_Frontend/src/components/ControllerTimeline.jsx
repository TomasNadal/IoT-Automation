// src/components/ControllerTimeline.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import axios from 'axios';
import LoadingScreen from './LoadingScreen';

const ControllerTimeline = ({ controllerId }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [timelineData, setTimelineData] = useState([]);
  const [sensorConfig, setSensorConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/front/controlador/${controllerId}/timeline`);
        setSensorConfig(response.data.sensor_config);
        const processedData = processTimelineData(response.data.timeline, response.data.sensor_config);
        setTimelineData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching timeline data:', err);
        setError('Failed to fetch timeline data. Please try again later.');
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [controllerId]);

  const processTimelineData = (timeline, config) => {
    const hourlyData = timeline.reduce((acc, entry) => {
      const hour = new Date(entry.start).getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, connected: 0, disconnected: 0 };
        Object.keys(config).forEach(sensor => {
          acc[hour][`${config[sensor].name}_on`] = 0;
          acc[hour][`${config[sensor].name}_off`] = 0;
        });
      }

      const duration = (new Date(entry.end) - new Date(entry.start)) / 60000; // duration in minutes
      if (entry.status === 'connected') {
        acc[hour].connected += duration;
        Object.entries(entry.sensors).forEach(([sensor, value]) => {
          const sensorName = config[sensor].name;
          const isOn = config[sensor].tipo === 'NA' ? value : !value;
          acc[hour][`${sensorName}_${isOn ? 'on' : 'off'}`] += duration;
        });
      } else {
        acc[hour].disconnected += duration;
      }

      return acc;
    }, {});

    return Object.values(hourlyData).sort((a, b) => a.hour - b.hour);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Typography variant="h5" mb={2}>Controller Timeline</Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={timelineData} stackOffset="expand">
          <XAxis dataKey="hour" />
          <YAxis tickFormatter={(value) => `${value * 100}%`} />
          <Tooltip 
            formatter={(value, name) => [`${Math.round(value * 60)} minutes`, name]}
            labelFormatter={(hour) => `Hour ${hour}`}
          />
          <Legend />
          <Bar dataKey="connected" stackId="a" fill={colors.greenAccent[500]} name="Connected" />
          <Bar dataKey="disconnected" stackId="a" fill={colors.redAccent[500]} name="Disconnected" />
          {Object.values(sensorConfig).map((sensor, index) => (
            <React.Fragment key={sensor.name}>
              <Bar 
                dataKey={`${sensor.name}_on`} 
                stackId="b" 
                fill={colors.blueAccent[index * 200 + 200]} 
                name={`${sensor.name} On`} 
              />
              <Bar 
                dataKey={`${sensor.name}_off`} 
                stackId="b" 
                fill={colors.blueAccent[index * 200 + 300]} 
                name={`${sensor.name} Off`} 
              />
            </React.Fragment>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ControllerTimeline;