import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme
} from '@mui/material';
import { DataContext } from '../../context/DataContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import Header from '../../components/Header';
import { tokens } from '../../theme';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import config from '../../config/config';
import { CircularProgress } from '@mui/material';

const AlertsManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { controladores } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);
  
  const [alerts, setAlerts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedController, setSelectedController] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    config: {
      sensor_name: '',
      conditions: [
        {
          from_state: 'Off',  // Changed from boolean to string
          to_state: 'On',     // Changed from boolean to string
          notify_web: true
        }
      ]
    }
  });

  const [selectedSensorType, setSelectedSensorType] = useState('NA'); // Track sensor type
  // Cargar alertas existentes
  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const alertPromises = controladores.map(controller =>
        axios.get(`${config.apiUrl}/alerts/controlador/${controller.id}/alerts`)
      );
      const responses = await Promise.all(alertPromises);
      const allAlerts = responses.flatMap(response => response.data?.alerts || []);
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setError('Error loading alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

// Add this effect to load alerts when controllers change
useEffect(() => {
  if (controladores.length > 0) {
    loadAlerts();
  }
}, [controladores]);

  // Escuchar eventos de websocket
  useEffect(() => {
    if (socket) {
      socket.on('alert_created', ({ alert }) => {
        setAlerts(prev => [...prev, alert]);
      });

      socket.on('alert_updated', ({ alert }) => {
        setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
      });

      socket.on('alert_deleted', ({ alert_id }) => {
        setAlerts(prev => prev.filter(a => a.id !== alert_id));
      });

      return () => {
        socket.off('alert_created');
        socket.off('alert_updated');
        socket.off('alert_deleted');
      };
    }
  }, [socket]);

  const handleOpenDialog = (controller = null, alert = null) => {
    setError('');
    setSelectedController(controller);
    setSelectedAlert(alert);
    if (alert) {
      setFormData({
        name: alert.name,
        description: alert.description || '',
        is_active: alert.is_active,
        config: alert.config
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
        config: {
          sensor_name: '',
          conditions: [
            {
              from_state: false,
              to_state: true,
              notify_web: true
            }
          ]
        }
      });
    }
    setOpenDialog(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('El nombre de la alerta es obligatorio');
      return false;
    }
    if (!formData.config.sensor_name) {
      setError('Debe seleccionar un sensor');
      return false;
    }
    return true;
  };


  // Update sensor type when sensor is selected
  const handleSensorChange = (e) => {
    const sensorName = e.target.value;
    let sensorType = 'NA';  // default
    
    // Find sensor type from controller config
    if (selectedController && selectedController.config) {
      for (const [key, value] of Object.entries(selectedController.config)) {
        if (value.name === sensorName) {
          sensorType = value.tipo;
          break;
        }
      }
    }

    setSelectedSensorType(sensorType);
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        sensor_name: sensorName
      }
    });
  };

  // Update the state transition selection
  const handleStateTransitionChange = (fromState, toState) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        conditions: [{
          from_state: fromState,
          to_state: toState,
          notify_web: true
        }]
      }
    });
  };

  // Modify the dialog content to include state transition selection
  const renderDialogContent = () => (
    <Box py={2}>
      <TextField
        fullWidth
        label="Nombre de la Alerta"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        margin="normal"
        error={error.includes('nombre')}
      />
      <TextField
        fullWidth
        label="Descripción"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        margin="normal"
        multiline
        rows={2}
      />
      {selectedController && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel>Sensor</InputLabel>
            <Select
              value={formData.config.sensor_name}
              onChange={handleSensorChange}
              error={error.includes('sensor')}
            >
              <MenuItem value="">Seleccione un sensor</MenuItem>
              {Object.entries(selectedController.config).map(([key, value]) => (
                <MenuItem key={key} value={value.name}>
                  {value.name} ({value.tipo})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Condición de Activación</InputLabel>
            <Select
              value={`${formData.config.conditions[0].from_state}-${formData.config.conditions[0].to_state}`}
              onChange={(e) => {
                const [fromState, toState] = e.target.value.split('-');
                handleStateTransitionChange(fromState, toState);
              }}
            >
              <MenuItem value="Off-On">Cuando el sensor se activa (Off → On)</MenuItem>
              <MenuItem value="On-Off">Cuando el sensor se desactiva (On → Off)</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tipo de Sensor: {selectedSensorType === 'NA' ? 'Normalmente Abierto' : 'Normalmente Cerrado'}
          </Typography>
        </>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          />
        }
        label={formData.is_active ? "Activa" : "Inactiva"}
      />
    </Box>
  );

// Update the URL in handleSubmit
const handleSubmit = async () => {
  if (!validateForm()) return;
  
  setLoading(true);
  setError('');
  try {
    if (selectedAlert) {
      await axios.put(`${config.apiUrl}/alerts/${selectedAlert.id}`, formData);
    } else {
      await axios.post(`${config.apiUrl}/alerts/controlador/${selectedController.id}/alerts`, {
        ...formData,
        controlador_id: selectedController.id
      });
    }
    setOpenDialog(false);
    await loadAlerts(); // Reload alerts after changes
  } catch (error) {
    console.error('Error saving alert:', error);
    setError('Error saving alert. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Update the handleDelete function
const handleDelete = async (alertId) => {
  if (!window.confirm('Are you sure you want to delete this alert?')) return;
  
  setLoading(true);
  try {
    await axios.delete(`${config.apiUrl}/alerts/${alertId}`);
    await loadAlerts(); // Reload alerts after deletion
  } catch (error) {
    console.error('Error deleting alert:', error);
    setError('Error deleting alert. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <Box m="20px">
      <Header 
        title="Gestión de Alertas" 
        subtitle="Crear y gestionar alertas para sus controladores" 
      />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      <Grid container spacing={3}>
        {controladores.map(controller => (
        <Grid item xs={12} key={controller.id}>
          <Card sx={{ backgroundColor: colors.primary[400], marginBottom: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" color={colors.greenAccent[500]}>
                  {controller.name}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog(controller)}
                  disabled={loading}
                >
                  Nueva Alerta
                </Button>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {alerts
                    .filter(alert => alert.controlador_id === controller.id)
                    .map(alert => (
                      <Grid item xs={12} md={6} lg={4} key={alert.id}>
                        <Card sx={{ backgroundColor: colors.primary[300] }}>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="h6" color={colors.grey[100]}>
                                {alert.name}
                              </Typography>
                              <Box>
                                <IconButton
                                  onClick={() => handleOpenDialog(controller, alert)}
                                  size="small"
                                  disabled={loading}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleDelete(alert.id)}
                                  size="small"
                                  disabled={loading}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="body2" color={colors.grey[300]}>
                              {alert.description || 'No description'}
                            </Typography>
                            <Typography variant="body2" color={colors.grey[300]} mt={1}>
                              Sensor: {alert.config?.sensor_name || 'Not specified'}
                            </Typography>
                            <Box mt={1}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={alert.is_active}
                                    onChange={async () => {
                                      try {
                                        await axios.put(`${config.apiUrl}/alerts/${alert.id}`, {
                                          ...alert,
                                          is_active: !alert.is_active
                                        });
                                        await loadAlerts();
                                      } catch (error) {
                                        console.error('Error updating alert:', error);
                                        setError('Error updating alert status');
                                      }
                                    }}
                                    disabled={loading}
                                  />
                                }
                                label={alert.is_active ? "Activa" : "Inactiva"}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  {alerts.filter(alert => alert.controlador_id === controller.id).length === 0 && (
                    <Grid item xs={12}>
                      <Typography color={colors.grey[300]} textAlign="center">
                        No hay alertas para este controlador
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
      </Grid>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {selectedAlert ? 'Editar Alerta' : 'Crear Nueva Alerta'}
        </DialogTitle>
        <DialogContent>
          {renderDialogContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Guardando...' : selectedAlert ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsManagement;