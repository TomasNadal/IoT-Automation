import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
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
import AlertHistory from "../../components/AlertHistory";
import RefreshIcon from '@mui/icons-material/Refresh';


const ControllerDetail = () => {
  const { id } = useParams();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // Get data from contexts
  const { controladores, updateControlador } = useContext(DataContext);
  const { socket } = useContext(WebSocketContext);

  // Local states for additional data not in the context
  const [recentChanges, setRecentChanges] = useState([]);
  const [uptimeDowntimeData, setUptimeDowntimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get controller from context using useMemo
  const controller = useMemo(() => 
    controladores.find(c => c.id === id),
    [controladores, id]
  );

  const fetchChangesWithMapping = useCallback(async (controllerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/front/controlador/${controllerId}/changes`);
      
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

  // Fetch additional data not available in context
  const fetchAdditionalData = useCallback(async () => {
    if (!controller) return;
    
    setLoading(true);
    setError(null);
    try {
      const [changesResponse, uptimeDowntimeResponse] = await Promise.all([
        fetchChangesWithMapping(id),
        axios.get(`http://localhost:5000/front/controlador/${id}/uptime-downtime`)
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

  // Initial data fetch
  useEffect(() => {
    fetchAdditionalData();
  }, [fetchAdditionalData]);

  // Socket update handler
  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        if (data.controlador_id === id) {
          // The DataContext will handle the main controller update
          // We just need to refresh our additional data
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
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAdditionalData}
          startIcon={<RefreshIcon />}
        >
          Refresh Data
        </Button>
      </Box>
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

          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ backgroundColor: colors.primary[400] }}>
            <CardContent>

              <ConfiguracionControlador controladorId={controller.id} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ControllerDetail;