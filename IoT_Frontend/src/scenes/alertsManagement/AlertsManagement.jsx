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
          from_state: false,
          to_state: true,
          notify_web: true
        }
      ]
    }
  });

  // Cargar alertas existentes
  const loadAlerts = async () => {
    try {
      const alertPromises = controladores.map(controller =>
        axios.get(`http://localhost:5000/front/controlador/${controller.id}/alerts`)
      );
      const responses = await Promise.all(alertPromises);
      const allAlerts = responses.flatMap(response => response.data.alerts || []);
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
      setError('Error al cargar las alertas');
    }
  };

  useEffect(() => {
    loadAlerts();
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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    try {
      if (selectedAlert) {
        await axios.put(`http://localhost:5000/alerts/alerts/${selectedAlert.id}`, formData);
      } else {
        await axios.post(`http://localhost:5000/alerts/controlador/${selectedController.id}/alerts`, {
          ...formData,
          controlador_id: selectedController.id
        });
      }
      setOpenDialog(false);
      loadAlerts(); // Recargar las alertas
    } catch (error) {
      console.error('Error al guardar la alerta:', error);
      setError('Error al guardar la alerta. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta alerta?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/alerts/alerts/${alertId}`);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error al eliminar la alerta:', error);
      setError('Error al eliminar la alerta');
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
                  >
                    Nueva Alerta
                  </Button>
                </Box>

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
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleDelete(alert.id)}
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="body2" color={colors.grey[300]}>
                              {alert.description}
                            </Typography>
                            <Box mt={1}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={alert.is_active}
                                    onChange={async () => {
                                      try {
                                        await axios.put(`http://localhost:5000/alerts/alerts/${alert.id}`, {
                                          ...alert,
                                          is_active: !alert.is_active
                                        });
                                        loadAlerts();
                                      } catch (error) {
                                        console.error('Error al actualizar la alerta:', error);
                                      }
                                    }}
                                  />
                                }
                                label={alert.is_active ? "Activa" : "Inactiva"}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
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
              <FormControl fullWidth margin="normal">
                <InputLabel>Sensor</InputLabel>
                <Select
                  value={formData.config.sensor_name}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      sensor_name: e.target.value
                    }
                  })}
                  error={error.includes('sensor')}
                >
                  <MenuItem value="">Seleccione un sensor</MenuItem>
                  {Object.entries(selectedController.config).map(([key, value]) => (
                    <MenuItem key={key} value={value.name}>
                      {value.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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