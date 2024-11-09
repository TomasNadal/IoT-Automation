import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, useTheme, Alert } from '@mui/material';
import { tokens } from '../../theme';
import axios from 'axios';
import { DataContext } from '../../context/DataContext';
import ConfiguracionControlador from '../../components/ConfiguracionControlador';
import Header from "../../components/Header";

const AddControllerPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const { updateControlador } = useContext(DataContext);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    value_sensor1: { name: '', tipo: 'NA', email: false },
    value_sensor2: { name: '', tipo: 'NA', email: false },
    value_sensor3: { name: '', tipo: 'NA', email: false },
    value_sensor4: { name: '', tipo: 'NA', email: false },
    value_sensor5: { name: '', tipo: 'NA', email: false },
    value_sensor6: { name: '', tipo: 'NA', email: false },
  });

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
  };

  const isConfigValid = () => {
    return Object.values(config).some(sensor => sensor.name !== '');
  };

  const isFormValid = () => {
    return name.trim() !== '' && 
           id.trim() !== '' && 
           isConfigValid();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isFormValid()) {
      setError('Please fill in all required fields and configure at least one sensor');
      return;
    }
  
    try {
      const response = await axios.post('https://calm-awfully-shrew.ngrok-free.app/front/dashboard/controlador', {
        name,
        id,
        empresa_id: empresaId,
        config,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
  
      if (response.status === 201) {
        updateControlador(response.data);
        navigate(`/empresa/${empresaId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while adding the controller');
    }
  };

  return (
    <Box m="20px">
      <Header title="Añade un controlador" subtitle="Crea y configura un controlador
      " />
      
      <Box display="flex" flexDirection="column" gap={4}>
        {/* Controller Details Section */}
        <Box
          backgroundColor={colors.primary[400]}
          p="30px"
          borderRadius="4px"
          width="100%"
          maxWidth="600px"
          mx="auto"
        >
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
            Detalles del controlador
          </Typography>
          <Box component="form">
            <TextField
              fullWidth
              label="Nombre del controlador"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="ID Controlador (teléfono)"
              value={id}
              onChange={(e) => setId(e.target.value)}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
          </Box>
        </Box>

        {/* Configuration Section */}
        <Box width="100%">
          <ConfiguracionControlador 
            controladorId="new" 
            initialConfig={config}
            onConfigChange={handleConfigChange}
          />
        </Box>
        
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', maxWidth: '600px', mx: 'auto' }}>
            {error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" justifyContent="center" gap={2} mt={2}>
          <Button
            variant="contained"
            onClick={() => navigate(`/empresa/${empresaId}`)}
            sx={{
              backgroundColor: colors.grey[700],
              color: colors.grey[100],
              '&:hover': { backgroundColor: colors.grey[800] }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid()}
            sx={{
              backgroundColor: colors.blueAccent[700],
              color: colors.grey[100],
              '&:hover': { backgroundColor: colors.blueAccent[800] },
              '&.Mui-disabled': {
                backgroundColor: colors.grey[500],
                color: colors.grey[300]
              }
            }}
          >
            Añadir controlador
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddControllerPage;