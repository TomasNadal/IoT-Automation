import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from "../theme";
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const CycleAnalytics = ({ controladorId }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/front/controlador/${controladorId}/analytics`
        );
        setAnalyticsData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [controladorId]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!analyticsData) return null;

  const { summary, cycle_times, hourly_distribution, efficiency_distribution } = analyticsData;

  // Custom chart colors
  const chartColors = {
    primary: colors.greenAccent[500],
    secondary: colors.blueAccent[300],
    accent: colors.redAccent[500],
    pieColors: [colors.greenAccent[500], colors.blueAccent[300], colors.redAccent[500]]
  };

  return (
    <Box>
      <Typography variant="h5" color={colors.greenAccent[500]} mb={2}>
        Cycle Analytics
      </Typography>
      
      {/* KPI Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color={colors.grey[100]} variant="h6" mb={1}>
                    Average Cycle Time
                  </Typography>
                  <Typography variant="h4" color={colors.greenAccent[500]}>
                    {Math.floor(summary.avg_cycle_time / 60)}h {Math.round(summary.avg_cycle_time % 60)}m
                  </Typography>
                </Box>
                <AccessTimeIcon sx={{ color: colors.greenAccent[500], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color={colors.grey[100]} variant="h6" mb={1}>
                    Cycles Today
                  </Typography>
                  <Typography variant="h4" color={colors.greenAccent[500]}>
                    {summary.cycles_today}
                  </Typography>
                </Box>
                <AutorenewIcon sx={{ color: colors.greenAccent[500], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color={colors.grey[100]} variant="h6" mb={1}>
                    Efficiency Rate
                  </Typography>
                  <Typography variant="h4" color={colors.greenAccent[500]}>
                    {summary.efficiency_rate}%
                  </Typography>
                </Box>
                <SpeedIcon sx={{ color: colors.greenAccent[500], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color={colors.grey[100]} variant="h6" mb={1}>
                    Interruptions
                  </Typography>
                  <Typography variant="h4" color={colors.greenAccent[500]}>
                    {efficiency_distribution.find(d => d.name === 'Interrupted Cycles')?.value || 0}
                  </Typography>
                </Box>
                <ErrorOutlineIcon sx={{ color: colors.greenAccent[500], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cycle Time Trend */}
      <Card sx={{ backgroundColor: colors.primary[400], mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color={colors.grey[100]} mb={2}>
            Cycle Time Trend
          </Typography>
          <Box height="400px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cycle_times}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[800]} />
                <XAxis 
                  dataKey="date" 
                  stroke={colors.grey[100]}
                />
                <YAxis 
                  stroke={colors.grey[100]}
                  label={{ 
                    value: 'Minutes', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: colors.grey[100] }
                  }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: colors.primary[400],
                    borderColor: colors.grey[100]
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cycleTime" 
                  stroke={chartColors.primary} 
                  name="Cycle Time"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke={chartColors.secondary} 
                  strokeDasharray="5 5" 
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h6" color={colors.grey[100]} mb={2}>
                Daily Cycle Distribution
              </Typography>
              <Box height="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[800]} />
                    <XAxis 
                      dataKey="hour"
                      stroke={colors.grey[100]}
                    />
                    <YAxis stroke={colors.grey[100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: colors.primary[400],
                        borderColor: colors.grey[100]
                      }}
                    />
                    <Bar dataKey="cycles" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h6" color={colors.grey[100]} mb={2}>
                Cycle Efficiency Distribution
              </Typography>
              <Box height="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={efficiency_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {efficiency_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors.pieColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: colors.primary[400],
                        borderColor: colors.grey[100]
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CycleAnalytics;