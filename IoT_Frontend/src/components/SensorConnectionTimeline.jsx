import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const SensorConnectionTimeline = ({ controladorId, sensors, fetchSensorData }) => {
  const [selectedSensor, setSelectedSensor] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());
  const [data, setData] = useState([]);

  useEffect(() => {
    if (selectedSensor && startDate && endDate) {
      fetchSensorData(controladorId, selectedSensor, startDate, endDate)
        .then(responseData => {
          const formattedData = responseData.map(item => ({
            date: new Date(item.date).toLocaleDateString(),
            connected: item.connected / 60, // Convert minutes to hours
            disconnected: item.disconnected / 60,
            noData: item.noData / 60
          }));
          setData(formattedData);
        })
        .catch(console.error);
    }
  }, [controladorId, selectedSensor, startDate, endDate, fetchSensorData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
          <p className="label">{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toFixed(2)} hours`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Select
          value={selectedSensor}
          onChange={(e) => setSelectedSensor(e.target.value)}
          displayEmpty
        >
          <MenuItem value="" disabled>Select a sensor</MenuItem>
          {sensors.map(sensor => (
            <MenuItem key={sensor.id} value={sensor.id}>{sensor.name}</MenuItem>
          ))}
        </Select>
        <DatePicker
          selected={startDate}
          onChange={date => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
        />
        <DatePicker
          selected={endDate}
          onChange={date => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
        />
      </Box>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
        >
          <XAxis type="number" domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} label={{ value: 'Hours', position: 'bottom' }} />
          <YAxis dataKey="date" type="category" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="connected" stackId="a" fill="#82ca9d" name="Connected" />
          <Bar dataKey="disconnected" stackId="a" fill="#8884d8" name="Disconnected" />
          <Bar dataKey="noData" stackId="a" fill="#ffc658" name="No Data" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SensorConnectionTimeline;