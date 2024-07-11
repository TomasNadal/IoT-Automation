import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Header from "../../components/Header";
import React, { useEffect, useState } from 'react';
import ControladoresList from "../../components/ControladoresList";
import ControladoresConnectedCount from "../../components/ControladoresConnectedCount";
import SensorStatusCount from "../../components/SensorStatusCount";
import axios from 'axios';

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [data, setData] = useState(null); // Para almacenar datos del servidor
  const [error, setError] = useState(null); // Para almacenar mensajes de error
  const [isLoading, setIsLoading] = useState(true); // Para controlar el estado de carga

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/test-home'); // Ajusta el puerto si es necesario
        setData(response.data.message); // Asume que "message" es la propiedad esperada
      } catch (error) {
        if (error.response) {
          setError(`Error: ${error.response.status} - ${error.response.data}`); // Detalles del error
        } else if (error.request) {
          setError('Error: No response from server'); // Sin respuesta del servidor
        } else {
          setError(`Error: ${error.message}`); // Error general
        }
      } finally {
        setIsLoading(false); // Indicar que la carga ha terminado
      }
    };

    fetchData(); // Llama a la función para obtener datos
  }, []);


  return (
    <Box m="20px">
      {/* HEADER */}
      
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="DASHBOARD" subtitle="Bienvenido a tu dashboard" />

        <Box>
          <Button
            sx={{
              backgroundColor: colors.blueAccent[700],
              color: colors.grey[100],
              fontSize: "14px",
              fontWeight: "bold",
              padding: "10px 20px",
            }}
          >
            <DownloadOutlinedIcon sx={{ mr: "10px" }} />
            Download Reports
          </Button>
        </Box>
      </Box>

      {/* GRID & CHARTS */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="140px"
        gap="20px"
      >
        {/* ROW 1 */}
        <ControladoresConnectedCount/>
        <SensorStatusCount sensorName={'Lleno'}/>
        <SensorStatusCount sensorName={'Listo'}/>
        <SensorStatusCount sensorName={'Marcha'}/>

        {/* ROW 2 */}
        <Box
          gridColumn="span 8"
          gridRow="span 3"
          backgroundColor={colors.primary[400]}
          overflow="auto"
        >
          <ControladoresList/>
          
        </Box>
        <Box
          gridColumn="span 4"
          gridRow="span 2"
          backgroundColor={colors.primary[400]}
          overflow="auto"
        >
          
          
        </Box>

      </Box>
    </Box>
  );
};

export default Dashboard;
