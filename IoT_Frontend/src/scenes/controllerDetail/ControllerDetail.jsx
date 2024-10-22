import React, { useEffect, useState, useContext, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Typography, Grid, useTheme, CircularProgress, Button,
  Card, CardContent
} from "@mui/material";
import { DataContext } from "../../context/DataContext";
import { WebSocketContext } from "../../context/WebSocketContext";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import axios from "axios";
import ConfiguracionControlador from "../../components/ConfiguracionControlador";
import RecentChanges from "../../components/RecentChanges";
import ControllerCard from "../../components/ControllerCard";
import UptimeDowntimeChart from '../../components/UptimeDowntimeChart';
import RefreshIcon from '@mui/icons-material/Refresh';

const ControllerDetail = () => {
  const { id } = useParams();
  const { controladores, updateControlador } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);
  const [controller, setController] = useState(null);
  const [recentChanges, setRecentChanges] = useState([]);
  const [uptimeDowntimeData, setUptimeDowntimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);



  const fetchChangesWithMapping = useCallback(async (controllerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/front/controlador/${controllerId}/changes`);
      const controlador = controladores.find(c => c.id === controllerId);
      
      if (!controlador) {
        console.error(`Controller with id ${controllerId} not found`);
        return [];
      }

      const sensorNameMap = Object.entries(controlador.config).reduce((acc, [key, value]) => {
        acc[key] = value.name;
        return acc;
      }, {});

      return response.data.map(change => ({
        ...change,
        controladorId: controlador.id,
        controladorName: controlador.name,
        changes: change.changes.map(c => ({
          ...c,
          sensor: sensorNameMap[c.sensor] || c.sensor
        }))
      }));
    } catch (error) {
      console.error(`Error fetching changes for controller ${controllerId}:`, error);
      return [];
    }
  }, [controladores]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [controllerResponse, changesResponse, uptimeDowntimeResponse] = await Promise.all([
        axios.get(`http://localhost:5000/front/controlador/${id}/detail`),
        fetchChangesWithMapping(id),
        axios.get(`http://localhost:5000/front/controlador/${id}/uptime-downtime`)
      ]);

      if (controllerResponse) setController(controllerResponse.data);
      if (changesResponse) {
        console.log("Fetched changes:", changesResponse);
        setRecentChanges(changesResponse);
      }
      if (uptimeDowntimeResponse) {
        console.log("Fetched uptime/downtime data:", uptimeDowntimeResponse.data);
        setUptimeDowntimeData(uptimeDowntimeResponse.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch some data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchChangesWithMapping]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleControllerUpdate = useCallback((data) => {
    setController(prev => ({
      ...prev,
      last_signal: data.new_signal,
    }));
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        if (data.controlador_id === id) {
          updateControlador(data);
          fetchData();
        }
      };

      socket.on("update_controladores", handleUpdate);

      return () => {
        socket.off("update_controladores", handleUpdate);
      };
    }
  }, [socket, id, updateControlador, fetchData]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!controller || !uptimeDowntimeData) return <Typography>Controller not found or data not available</Typography>;

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Header title={controller.name} subtitle="Detailed Controller View" />
        <Button
          variant="contained"
          color="primary"
          onClick={fetchData}
          startIcon={<RefreshIcon />}
        >
          Refresh Data
        </Button>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
        <ControllerCard 
            controller={controller} 
            onUpdateController={handleControllerUpdate}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400], height: '100%', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h5" color={colors.greenAccent[500]} mb={2}>
                Recent Changes
              </Typography>
              <RecentChanges changes={recentChanges} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>

              <UptimeDowntimeChart controladorId={controller.id} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h5" color={colors.greenAccent[500]} mb={2}>
                Controller Configuration
              </Typography>
              <ConfiguracionControlador controladorId={controller.id} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ControllerDetail;