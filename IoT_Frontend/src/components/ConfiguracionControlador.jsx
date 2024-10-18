import React, { useState, useContext, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import axios from "axios";
import { tokens } from "../theme";
import { DataContext } from "../context/DataContext"; // Import DataContext

const ConfiguracionControlador = ({ controladorId }) => {
  const { controladores, updateControlador } = useContext(DataContext); // Use DataContext
  const [pendingConfig, setPendingConfig] = useState({});
  const [error, setError] = useState(null);
  const colors = tokens();

  const controlador = controladores.find(c => c.id === controladorId);

  useEffect(() => {
    if (controlador) {
      setPendingConfig(controlador.config);
    }
  }, [controlador]);

  const handleConfigChange = (sensorName, key, value) => {
    setError(null);
    setPendingConfig((prevConfig) => ({
      ...prevConfig,
      [sensorName]: {
        ...prevConfig[sensorName],
        [key]: value,
      },
    }));
  };

  const resetConfig = () => {
    if (controlador) {
      setPendingConfig({ ...controlador.config });
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`http://localhost:5000/dashboard/${controladorId}/config`, 
        { config: pendingConfig },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false,
        }
      ).then(response => {
        // Handle success
      }).catch(error => {
        console.error('Error:', error);
      });
      setError(null);
      
      // Update the controlador in the DataContext
      updateControlador({
        ...controlador,
        config: pendingConfig
      });
    } catch (err) {
      setError("Error al guardar la configuración");
      console.error("Error:", err.response?.data || err);
    }
  };

  if (error) {
    return <Typography color="red">{error}</Typography>;
  }

  if (!controladorId || !controlador) {
    return (
      <Typography variant="h3" color={colors.grey[100]}>
        Selecciona un controlador para ver la configuración.
      </Typography>
    );
  }

  if (Object.keys(pendingConfig).length === 0) {
    return (
      <Typography variant="h3" color={colors.grey[100]}>
        No hay datos para mostrar.
      </Typography>
    );
  }

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h2" color={colors.grey[100]}>
          Configuración del Controlador
        </Typography>

        <Button
          onClick={resetConfig}
          sx={{
            backgroundColor: colors.blueAccent[700],
            color: colors.grey[100],
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
          }}
        >
          Restablecer Configuración
        </Button>
        <Button
          sx={{
            backgroundColor: colors.blueAccent[700],
            color: colors.grey[100],
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
          }}
          onClick={handleSave}
        >
          Guardar Cambios
        </Button>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gap="20px"
        mt="20px"
      >
        {Object.entries(pendingConfig).map(([sensor, sensor_config]) => (
          <Box
            key={sensor}
            gridColumn="span 4"
            backgroundColor={colors.primary[400]}
            p="20px"
          >
            <Typography variant="h3" color={colors.grey[100]}>
              Selecciona la configuración para: {sensor}
            </Typography>
            <label>
              <Typography color={colors.grey[200]}>Nombre</Typography>
              <select
                value={sensor_config.name || ""}
                onChange={(e) => handleConfigChange(sensor, "name", e.target.value)}
              >
                <option value="Aceite">Aceite</option>
                <option value="Lleno">Lleno</option>
                <option value="Magnetotermico">Magnetotermico</option>
                <option value="Listo">Listo</option>
                <option value="Marcha">Marcha</option>
                <option value="Temperatura">Temperatura</option>
              </select>
            </label>
            <br />
            <label>
              <Typography color={colors.grey[200]}>Tipo (NA/NC)</Typography>
              <select
                value={sensor_config.tipo || ""}
                onChange={(e) => handleConfigChange(sensor, "tipo", e.target.value)}
              >
                <option value="NA">NA</option>
                <option value="NC">NC</option>
              </select>
            </label>
            <br />
            <label>
              <Typography color={colors.grey[200]}>Recibir Correo Electrónico</Typography>
              <input
                type="checkbox"
                checked={sensor_config.email || false}
                onChange={(e) =>
                  handleConfigChange(sensor, "email", e.target.checked)
                }
              />
            </label>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ConfiguracionControlador;