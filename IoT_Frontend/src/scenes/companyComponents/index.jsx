import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, Chip, Avatar, LinearProgress } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';

const CompanyComponents = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanyComponents = async () => {
      try {
        const response = await axios.get('http://localhost:5000/front/dashboard/empresa/b8cdf279-d884-4db1-aa2c-eb8d7e4c41bf/components');
        setCompanyData(response.data);
      } catch (err) {
        setError('Failed to fetch company components. Please try again later.');
        console.error('Error fetching company components:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyComponents();
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <Typography color="error">{error}</Typography>;

  const isConnected = (lastSignal) => {
    if (!lastSignal) return false;
    const lastSignalTime = new Date(lastSignal.tstamp).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - lastSignalTime) < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <Box m="20px">
      <Header title="Company Components" subtitle={`Overview of all components for ${companyData.company_name}`} />
      <Grid container spacing={3}>
        {companyData.components.map((component) => (
          <Grid item xs={12} sm={6} md={4} key={component.id}>
            <Card sx={{ backgroundColor: colors.primary[400], height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" color={colors.greenAccent[500]}>
                    {component.name}
                  </Typography>
                  <Chip
                    icon={isConnected(component.last_signal) ? <SignalCellularAltIcon /> : <SignalCellularOffIcon />}
                    label={isConnected(component.last_signal) ? "Connected" : "Disconnected"}
                    color={isConnected(component.last_signal) ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color={colors.grey[100]} mb={1}>
                  ID: {component.id}
                </Typography>
                <Typography variant="body2" color={colors.grey[100]} mb={2}>
                  Last Signal: {component.last_signal ? new Date(component.last_signal.tstamp).toLocaleString() : 'N/A'}
                </Typography>
                <Typography variant="body2" color={colors.grey[100]} mb={1}>
                  Sensor Configuration:
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(component.config).map(([key, value]) => (
                    <Grid item xs={6} key={key}>
                      <Chip
                        avatar={<Avatar>{key.slice(-1)}</Avatar>}
                        label={`${value.name} (${value.tipo})`}
                        variant="outlined"
                        size="small"
                        sx={{ width: '100%', justifyContent: 'flex-start' }}
                      />
                    </Grid>
                  ))}
                </Grid>
                {component.last_signal && (
                  <Box mt={2}>
                    <Typography variant="body2" color={colors.grey[100]} mb={1}>
                      Sensor Status:
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.entries(component.last_signal)
                        .filter(([key]) => key.startsWith('value_sensor'))
                        .map(([key, value]) => (
                          <Grid item xs={6} key={key}>
                            <Chip
                              label={`${key.slice(-1)}: ${value ? 'ON' : 'OFF'}`}
                              color={value ? "success" : "error"}
                              size="small"
                              sx={{ width: '100%' }}
                            />
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CompanyComponents;