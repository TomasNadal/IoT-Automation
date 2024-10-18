import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import SettingsIcon from '@mui/icons-material/Settings';
import { tokens } from '../theme';

const QuickActionButtons = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="100%"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
        Quick Actions
      </Typography>
      <Box display="flex" flexDirection="column" gap="10px">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          style={{ backgroundColor: colors.blueAccent[700], color: colors.grey[100] }}
        >
          Add New Controller
        </Button>
        <Button
          variant="contained"
          startIcon={<WarningIcon />}
          style={{ backgroundColor: colors.redAccent[700], color: colors.grey[100] }}
        >
          View All Alerts
        </Button>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          style={{ backgroundColor: colors.greenAccent[700], color: colors.grey[100] }}
        >
          System Settings
        </Button>
      </Box>
    </Box>
  );
};

export default QuickActionButtons;