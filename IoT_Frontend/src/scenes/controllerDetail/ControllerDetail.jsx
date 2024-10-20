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
import SensorConnectionTimeline from "../../components/SensorConnectionTimeline";
import ConfiguracionControlador from "../../components/ConfiguracionControlador";
import RecentChanges from "../../components/RecentChanges";
import ControllerInfo from "../../components/ControllerInfo";

const ControllerDetail = () => {
  const { id } = useParams();
  const { controladores, updateControlador } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);
  const [controller, setController] = useState(null);
  const [recentChanges, setRecentChanges] = useState([]);
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
      const [controllerResponse, changesResponse] = await Promise.all([
        axios.get(`http://localhost:5000/front/controlador/${id}/detail`),
        fetchChangesWithMapping(id)
      ]);

      if (controllerResponse) setController(controllerResponse.data);
      if (changesResponse) {
        console.log("Fetched changes:", changesResponse);
        setRecentChanges(changesResponse);
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
  if (!controller) return <Typography>Controller not found</Typography>;

  return (
    <Box m="20px">
      <Header title={controller.name} subtitle="Detailed Controller View" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ControllerInfo controller={controller} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400], height: '100%', overflow: 'auto' }}>
            <CardContent>
              <RecentChanges changes={recentChanges} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>
              <Typography variant="h5" mb={2}>Sensor Connection Timeline</Typography>
              <SensorConnectionTimeline
                controladorId={controller.id}
                sensors={Object.entries(controller.config).map(([key, config]) => ({
                  id: key,
                  name: config.name
                }))}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <ConfiguracionControlador controladorId={controller.id} />
        </Grid>
      </Grid>
      <Box mt={3}>
        <Button variant="contained" color="primary" onClick={fetchData}>
          Refresh Data
        </Button>
      </Box>
    </Box>
  );
};

export default ControllerDetail;