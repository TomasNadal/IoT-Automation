import React, { useState, useContext, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Switch, 
  Grid, 
  styled, 
  useTheme, 
  Alert,
  Snackbar 
} from "@mui/material";
import axios from "axios";
import { DataContext } from "../context/DataContext";
import { tokens } from "../theme";

const StyledCard = styled(Card)(({ theme }) => {
  const colors = tokens(theme.palette.mode);
  return {
    backgroundColor: colors.primary[400],
    transition: 'background-color 0.3s, transform 0.3s',
    '&:hover': {
      backgroundColor: colors.primary[300],
      transform: 'translateY(-2px)',
    },
  };
});

const StyledButton = styled(Button)(({ theme }) => {
  const colors = tokens(theme.palette.mode);
  return {
    backgroundColor: colors.blueAccent[700],
    color: colors.grey[100],
    fontSize: "14px",
    fontWeight: "bold",
    padding: "10px 20px",
    '&:hover': {
      backgroundColor: colors.blueAccent[800],
    },
    '&.MuiButton-outlined': {
      borderColor: colors.grey[400],
      color: colors.grey[100],
      '&:hover': {
        backgroundColor: colors.grey[700],
      },
    },
  };
});

const getFriendlySensorName = (sensorKey) => {
  const match = sensorKey.match(/value_sensor(\d+)/);
  return match ? `Sensor ${match[1]}` : sensorKey;
};

const ConfiguracionControlador = ({ controladorId, initialConfig, onConfigChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { controladores, updateControlador } = useContext(DataContext);
  const [pendingConfig, setPendingConfig] = useState(initialConfig || {});
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const controlador = controladorId !== "new" ? controladores.find(c => c.id === controladorId) : null;

  useEffect(() => {
    if (controlador) {
      setPendingConfig(controlador.config);
      validateConfig(controlador.config);
      setHasChanges(false);
    } else if (initialConfig) {
      setPendingConfig(initialConfig);
      validateConfig(initialConfig);
      setHasChanges(false);
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
    setSuccessMessage("");
    const newConfig = {
      ...pendingConfig,
      [sensorName]: {
        ...pendingConfig[sensorName],
        [key]: value,
      },
    };
    setPendingConfig(newConfig);
    validateConfig(newConfig);
    setHasChanges(true);
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
    setHasChanges(false);
    setSuccessMessage("");
    setError(null);
  };

  const handleSave = async () => {
    if (!validateConfig(pendingConfig)) {
      setError("No se puede guardar una configuración inválida.");
      return;
    }

    if (controladorId === "new") {
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
      setSuccessMessage("Configuración guardada con éxito");
      setHasChanges(false);
      updateControlador({
        ...controlador,
        config: pendingConfig
      });
    } catch (err) {
      setError("Error al guardar la configuración");
      console.error("Error:", err.response?.data || err);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessMessage("");
  };

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h2" color={colors.grey[100]}>
          Configuración del Controlador
        </Typography>
        <Box>
          <StyledButton
            onClick={resetConfig}
            sx={{ mr: 2 }}
            variant="outlined"
            disabled={!hasChanges}
          >
            Restablecer Configuración
          </StyledButton>
          {controladorId !== "new" && (
            <StyledButton
              onClick={handleSave}
              disabled={!isValid || !hasChanges}
              variant="contained"
            >
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

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSuccess} 
          severity="success" 
          sx={{ 
            width: '100%',
            backgroundColor: colors.greenAccent[600],
            color: colors.primary[100]
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {hasChanges && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Hay cambios sin guardar en la configuración
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(pendingConfig).map(([sensor, sensor_config]) => (
          <Grid item xs={12} sm={6} md={4} key={sensor}>
            <StyledCard>
              <CardContent>
                <Typography variant="h5" sx={{ color: colors.grey[100] }} gutterBottom>
                  {getFriendlySensorName(sensor)}
                </Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel sx={{ color: colors.grey[100] }}>Nombre</InputLabel>
                  <Select
                    value={sensor_config.name || ""}
                    onChange={(e) => handleConfigChange(sensor, "name", e.target.value)}
                    label="Nombre"
                    sx={{
                      color: colors.grey[100],
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.grey[300],
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.blueAccent[400],
                      },
                      '.MuiSvgIcon-root': {
                        color: colors.grey[100],
                      },
                    }}
                  >
                    {["Aceite", "Lleno", "Magnetotermico", "Listo", "Marcha", "Temperatura"].map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel sx={{ color: colors.grey[100] }}>Tipo</InputLabel>
                  <Select
                    value={sensor_config.tipo || ""}
                    onChange={(e) => handleConfigChange(sensor, "tipo", e.target.value)}
                    label="Tipo"
                    sx={{
                      color: colors.grey[100],
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.grey[300],
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.blueAccent[400],
                      },
                      '.MuiSvgIcon-root': {
                        color: colors.grey[100],
                      },
                    }}
                  >
                    <MenuItem value="NA">NA</MenuItem>
                    <MenuItem value="NC">NC</MenuItem>
                  </Select>
                </FormControl>
                <Box display="flex" alignItems="center" mt={2}>
                  <Typography sx={{ color: colors.grey[100], flex: 1 }}>
                    Recibir Correo Electrónico
                  </Typography>
                  <Switch
                    checked={sensor_config.email || false}
                    onChange={(e) => handleConfigChange(sensor, "email", e.target.checked)}
                    color="primary"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: colors.greenAccent[500],
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: colors.greenAccent[500],
                      },
                    }}
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