import React, { useState, useContext, useEffect } from "react";
import { Box, Typography, Button, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Switch, Grid, styled, useTheme, Alert } from "@mui/material";
import axios from "axios";
import { DataContext } from "../context/DataContext";

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    transition: 'background-color 0.3s',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  fontSize: "14px",
  fontWeight: "bold",
  padding: "10px 20px",
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const getFriendlySensorName = (sensorKey) => {
  const match = sensorKey.match(/value_sensor(\d+)/);
  return match ? `Sensor ${match[1]}` : sensorKey;
};

const ConfiguracionControlador = ({ controladorId, initialConfig, onConfigChange }) => {
  const { controladores, updateControlador } = useContext(DataContext);
  const [pendingConfig, setPendingConfig] = useState(initialConfig || {});
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");
  const theme = useTheme();

  const controlador = controladorId !== "new" ? controladores.find(c => c.id === controladorId) : null;

  useEffect(() => {
    if (controlador) {
      setPendingConfig(controlador.config);
      validateConfig(controlador.config);
    } else if (initialConfig) {
      setPendingConfig(initialConfig);
      validateConfig(initialConfig);
    }
  }, [controlador, initialConfig]);

  const validateConfig = (config) => {
    const sensorNames = new Set();
    let isConfigValid = true;
    let message = "";

    Object.values(config).forEach(sensor => {
      if (sensor.name) {
        if (sensorNames.has(sensor.name)) {
          isConfigValid = false;
          message = "Configuración inválida: Nombres de sensores duplicados.";
        }
        sensorNames.add(sensor.name);
      }
    });

    setIsValid(isConfigValid);
    setValidationMessage(message);
    return isConfigValid;
  };

  const handleConfigChange = (sensorName, key, value) => {
    setError(null);
    const newConfig = {
      ...pendingConfig,
      [sensorName]: {
        ...pendingConfig[sensorName],
        [key]: value,
      },
    };
    setPendingConfig(newConfig);
    validateConfig(newConfig);
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const resetConfig = () => {
    if (controlador) {
      setPendingConfig(controlador.config);
      validateConfig(controlador.config);
    } else if (initialConfig) {
      setPendingConfig(initialConfig);
      validateConfig(initialConfig);
    }
  };

  const handleSave = async () => {
    if (!validateConfig(pendingConfig)) {
      setError("No se puede guardar una configuración inválida.");
      return;
    }

    if (controladorId === "new") {
      // For new controllers, we don't save here. The parent component will handle it.
      if (onConfigChange) {
        onConfigChange(pendingConfig);
      }
      return;
    }

    try {
      await axios.post(`http://localhost:5000/front/controlador/${controladorId}/config`, 
        { config: pendingConfig },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false,
        }
      );
      setError(null);
      updateControlador({
        ...controlador,
        config: pendingConfig
      });
    } catch (err) {
      setError("Error al guardar la configuración");
      console.error("Error:", err.response?.data || err);
    }
  };

  if (Object.keys(pendingConfig).length === 0) {
    return (
      <Typography variant="h3" color="textPrimary">
        No hay datos para mostrar.
      </Typography>
    );
  }

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h2" color="textPrimary">
          Configuración del Controlador
        </Typography>
        <Box>
          <StyledButton onClick={resetConfig} sx={{ mr: 2 }}>
            Restablecer Configuración
          </StyledButton>
          {controladorId !== "new" && (
            <StyledButton onClick={handleSave} disabled={!isValid}>
              Guardar Cambios
            </StyledButton>
          )}
        </Box>
      </Box>

      {!isValid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(pendingConfig).map(([sensor, sensor_config]) => (
          <Grid item xs={12} sm={6} md={4} key={sensor}>
            <StyledCard elevation={3}>
              <CardContent>
                <Typography variant="h5" color="textPrimary" gutterBottom>
                  {getFriendlySensorName(sensor)}
                </Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Nombre</InputLabel>
                  <Select
                    value={sensor_config.name || ""}
                    onChange={(e) => handleConfigChange(sensor, "name", e.target.value)}
                    label="Nombre"
                  >
                    {["Aceite", "Lleno", "Magnetotermico", "Listo", "Marcha", "Temperatura"].map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={sensor_config.tipo || ""}
                    onChange={(e) => handleConfigChange(sensor, "tipo", e.target.value)}
                    label="Tipo"
                  >
                    <MenuItem value="NA">NA</MenuItem>
                    <MenuItem value="NC">NC</MenuItem>
                  </Select>
                </FormControl>
                <Box display="flex" alignItems="center" mt={2}>
                  <Typography color="textSecondary">Recibir Correo Electrónico</Typography>
                  <Switch
                    checked={sensor_config.email || false}
                    onChange={(e) => handleConfigChange(sensor, "email", e.target.checked)}
                    color="primary"
                  />
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ConfiguracionControlador;