import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  useTheme,
  CircularProgress,
  Button,
} from "@mui/material";
import { DataContext } from "../../context/DataContext";
import { WebSocketContext } from "../../context/WebSocketContext";
import SensorStatus from "../../components/SensorStatus";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import axios from "axios";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { format, isToday } from "date-fns";
import SensorConnectionTimeline from "../../components/SensorConnectionTimeline";
import ConfiguracionControlador from "../../components/ConfiguracionControlador";

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoints = [
        `http://localhost:5000/dashboard/controlador/${id}/detail`,
        `http://localhost:5000/dashboard/controlador/${id}/changes`,
      ];

      const results = await Promise.all(
        endpoints.map(endpoint => 
          axios.get(endpoint).catch(error => {
            console.error(`Error fetching from ${endpoint}:`, error);
            return null;
          })
        )
      );

      const [controllerResponse, changesResponse] = results;

      if (controllerResponse) setController(controllerResponse.data);
      if (changesResponse) {
        const todayChanges = (changesResponse.data || []).filter((change) =>
          isToday(new Date(change.timestamp))
        );
        setRecentChanges(todayChanges);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch some data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorData = async (controladorId, sensorId, startDate, endDate) => {
    try {
      const response = await axios.get(`http://localhost:5000/dashboard/controlador/${controladorId}/sensor/${sensorId}/connection-data`, {
        params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      throw error;
    }
  };
  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = (data) => {
        if (data.controlador_id === parseInt(id)) {
          updateControlador(data);
          fetchData();
        }
      };

      socket.on("update_controladores", handleUpdate);

      return () => {
        socket.off("update_controladores", handleUpdate);
      };
    }
  }, [socket, id, updateControlador]);

  const getSensorImage = (sensorName, signalType, signalValue) => {
    const imagePath = `/images/sensors/${sensorName.toLowerCase()}.png`;
    return (
      <Box
        className={`sensor-container ${
          signalValue !== undefined
            ? signalType === "NA"
              ? signalValue === true
                ? "on"
                : "off"
              : signalValue === false
              ? "on"
              : "off"
            : "no tension"
        }`}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          backgroundColor: signalValue
            ? colors.greenAccent[500]
            : colors.redAccent[500],
        }}
      >
        <img
          src={imagePath}
          alt={sensorName}
          style={{ height: "20px", filter: "brightness(0) invert(1)" }}
        />
      </Box>
    );
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!controller) {
    return <Typography>Controller not found</Typography>;
  }

  return (
    <Box m="20px">
      <Header title={controller.name} subtitle="Detailed Controller View" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, backgroundColor: colors.primary[400] }}>
            <Typography variant="h5" mb={2}>Sensor Status</Typography>
            {Object.entries(controller.config).map(([key, config]) => (
              <SensorStatus
                key={key}
                name={config.name}
                value={controller.last_signal?.[config.name]}
                type={config.tipo}
              />
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              backgroundColor: colors.primary[400],
              height: "100%",
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            <Typography variant="h5" mb={2}>
              Recent Changes (Today)
            </Typography>
            {recentChanges.length > 0 ? (
              recentChanges.map((change, changeIndex) => (
                <Box key={`change-${changeIndex}-${change.timestamp}`} mb={2}>
                  <Typography
                    variant="subtitle2"
                    color={colors.greenAccent[500]}
                  >
                    {`${format(new Date(change.timestamp), "HH:mm:ss")}`}
                  </Typography>
                  {change.changes.map((detail, detailIndex) => {
                    const sensorConfig = controller.config[detail.sensor];
                    const sensorName = sensorConfig
                      ? sensorConfig.name
                      : "Unknown";
                    const sensorType = sensorConfig ? sensorConfig.tipo : "N/A";
                    return (
                      <Box
                        key={`detail-${changeIndex}-${detailIndex}`}
                        display="flex"
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="body2" color={colors.grey[100]} sx={{ flexGrow: 1 }}>
                          {`${sensorName}:`}
                        </Typography>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="flex-end"
                        >
                          {getSensorImage(
                            sensorName,
                            sensorType,
                            detail.old_value
                          )}
                          <ArrowForwardIcon
                            sx={{ mx: 1, color: colors.grey[100], fontSize: 16 }}
                          />
                          {getSensorImage(
                            sensorName,
                            sensorType,
                            detail.new_value
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color={colors.grey[100]}>
                No changes found for today.
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, backgroundColor: colors.primary[400] }}>
            <Typography variant="h5" mb={2}>Sensor Connection Timeline</Typography>
            <SensorConnectionTimeline
              controladorId={controller.id}
              sensors={Object.entries(controller.config).map(([key, config]) => ({
                id: key,
                name: config.name
              }))}
              fetchSensorData={fetchSensorData}
            />
          </Paper>
        </Grid>
      </Grid>

      <ConfiguracionControlador controladorId={controller.id} />
      <Box mt={3}>
        <Button variant="contained" color="primary" onClick={fetchData}>
          Refresh Data
        </Button>
      </Box>
    </Box>
  );
};

export default ControllerDetail;