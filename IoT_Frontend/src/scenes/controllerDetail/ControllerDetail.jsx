import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Grid, useTheme, CircularProgress, Button,
  Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Alert
} from "@mui/material";
import { DataContext } from "../../context/DataContext";
import { WebSocketContext } from "../../context/WebSocketContext";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import axios from "axios";
import ConfiguracionControlador from "../../components/ConfiguracionControlador";
import RecentChanges from "../../components/RecentChanges";
import ControllerCard from "../../components/ControllerCard";
import AlertHistory from "../../components/AlertHistory";
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';

const DeleteControllerDialog = ({ open, onClose, onConfirm, controllerName, isDeleting }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: colors.primary[400],
          backgroundImage: 'none',
          maxWidth: '500px',
        }
      }}
    >
      <DialogTitle sx={{ color: colors.grey[100] }}>
        Confirmar Eliminación
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: colors.grey[200], mb: 2 }}>
          ¿Está seguro que desea eliminar el controlador "{controllerName}"?
        </DialogContentText>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta acción eliminará permanentemente:
          <ul>
            <li>Todas las señales del controlador</li>
            <li>Todas las alertas configuradas</li>
            <li>Todo el historial de alertas</li>
            <li>Todas las métricas asociadas</li>
          </ul>
          Esta acción no se puede deshacer.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button 
          onClick={onClose}
          disabled={isDeleting}
          sx={{ 
            color: colors.grey[300],
            '&:hover': { backgroundColor: colors.primary[500] }
          }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained" 
          color="error"
          disabled={isDeleting}
          startIcon={<DeleteIcon />}
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar Controlador'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ControllerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const { controladores, updateControlador } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);

  const [recentChanges, setRecentChanges] = useState([]);
  const [uptimeDowntimeData, setUptimeDowntimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const controller = useMemo(() => 
    controladores.find(c => c.id === id),
    [controladores, id]
  );

  const fetchChangesWithMapping = useCallback(async (controllerId) => {
    try {
      const response = await axios.get(`https://calm-awfully-shrew.ngrok-free.app/front/controlador/${controllerId}/changes`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (!controller) {
        console.error(`Controller with id ${controllerId} not found`);
        return [];
      }

      const sensorNameMap = Object.entries(controller.config).reduce((acc, [key, value]) => {
        acc[key] = value.name;
        return acc;
      }, {});

      return response.data.map(change => ({
        ...change,
        controladorId: controller.id,
        controladorName: controller.name,
        changes: change.changes.map(c => ({
          ...c,
          sensor: sensorNameMap[c.sensor] || c.sensor
        }))
      }));
    } catch (error) {
      console.error(`Error fetching changes for controller ${controllerId}:`, error);
      return [];
    }
  }, [controller]);

  const fetchAdditionalData = useCallback(async () => {
    if (!controller) return;
    
    setLoading(true);
    setError(null);
    try {
      const [changesResponse, uptimeDowntimeResponse] = await Promise.all([
        fetchChangesWithMapping(id),
        axios.get(`https://calm-awfully-shrew.ngrok-free.app/front/controlador/${id}/uptime-downtime`)
      ]);

      if (changesResponse) {
        console.log("Fetched changes:", changesResponse);
        setRecentChanges(changesResponse);
      }
      if (uptimeDowntimeResponse) {
        console.log("Fetched uptime/downtime data:", uptimeDowntimeResponse.data);
        setUptimeDowntimeData(uptimeDowntimeResponse.data);
      }
    } catch (error) {
      console.error("Error fetching additional data:", error);
      setError("Failed to fetch some data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [id, controller, fetchChangesWithMapping]);

  const handleDeleteController = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await axios.delete(`https://calm-awfully-shrew.ngrok-free.app/front/dashboard/controlador/${controller.id}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      navigate('/company-components', { 
        replace: true,
        state: { 
          notification: {
            type: 'success',
            message: 'Controlador eliminado exitosamente'
          }
        }
      });
    } catch (error) {
      console.error('Error deleting controller:', error);
      setDeleteError(
        error.response?.data?.error || 
        'Ha ocurrido un error al eliminar el controlador'
      );
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchAdditionalData();
  }, [fetchAdditionalData]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        if (data.controlador_id === id) {
          fetchAdditionalData();
        }
      };

      socket.on("update_controladores", handleUpdate);
      return () => socket.off("update_controladores", handleUpdate);
    }
  }, [socket, id, fetchAdditionalData]);

  if (!controller) return <Typography>Controller not found</Typography>;
  if (loading && !uptimeDowntimeData) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Header title={controller.name} subtitle="Vista detallada del controlador" />
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={fetchAdditionalData}
            startIcon={<RefreshIcon />}
            sx={{ mr: 2 }}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<DeleteIcon />}
            disabled={isDeleting}
            sx={{
              backgroundColor: colors.redAccent[500],
              '&:hover': {
                backgroundColor: colors.redAccent[600],
              },
            }}
          >
            Eliminar Controlador
          </Button>
        </Box>
      </Box>

      {deleteError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setDeleteError(null)}
        >
          {deleteError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ControllerCard 
            controller={controller}
            onUpdateController={updateControlador}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400], height: '100%', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h5" color={colors.greenAccent[500]} mb={2}>
              </Typography>
              <RecentChanges changes={recentChanges} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Box
            backgroundColor={colors.primary[400]}
            p={3}
            borderRadius="4px"
          >
            <AlertHistory controladorId={controller.id} />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <ConfiguracionControlador controladorId={controller.id} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <DeleteControllerDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteController}
        controllerName={controller?.name}
        isDeleting={isDeleting}
      />
    </Box>
  );
};

export default ControllerDetail;