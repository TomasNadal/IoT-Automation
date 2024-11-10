import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Chip, useTheme, Divider } from '@mui/material';
import { tokens } from '../theme';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const RecentChanges = ({ changes }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const groupedChanges = useMemo(() => {
    return changes.reduce((acc, change) => {
      if (!acc[change.controladorName]) {
        acc[change.controladorName] = [];
      }
      acc[change.controladorName].push(change);
      return acc;
    }, {});
  }, [changes]);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      borderRadius="4px"
      height="400px"
      display="flex"
      flexDirection="column"
    >
      <Typography variant="h5" p={2} color={colors.grey[100]}>Cambios recientes</Typography>
      <Box
        flex={1}
        overflow="auto"
        p={2}
        sx={{
          '&::-webkit-scrollbar': {
            width: '0.4em'
          },
          '&::-webkit-scrollbar-track': {
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
            webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: colors.primary[700],
            outline: '1px solid slategrey'
          }
        }}
      >
        {Object.keys(groupedChanges).length === 0 ? (
          <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
          border={`1px solid ${colors.grey[300]}`}
          borderRadius="4px"
          backgroundColor={colors.primary[500]}
          p={2}
        >
          <HourglassEmptyIcon sx={{ fontSize: 50, color: colors.grey[300], mb: 1 }} />
          <Typography variant="h6" color={colors.grey[300]}>
            No hay cambios recientes
          </Typography>
        </Box>
        ) : (
          Object.entries(groupedChanges).map(([controladorName, controladorChanges]) => (
            <Card key={controladorName} sx={{ mb: 2, backgroundColor: colors.primary[300] }}>
              <CardContent>
                <Typography variant="h6" color={colors.greenAccent[500]} gutterBottom>
                  {controladorName}
                </Typography>
                {controladorChanges.map((change, changeIndex) => (
                  <Box key={changeIndex} mb={2}>
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={new Date(change.timestamp).toLocaleString()}
                      size="small"
                      sx={{ mb: 1, backgroundColor: colors.blueAccent[700], color: colors.grey[100] }}
                    />
                    {change.changes.map((c, i) => (
                      <Box key={i} display="flex" alignItems="center" mb={0.5}>
                        <Typography
                          variant="body2"
                          color={colors.grey[100]}
                          sx={{ minWidth: '120px', mr: 1 }}
                        >
                          {c.sensor}:
                        </Typography>
                        <Chip
                          label={c.old_value ? 'On' : 'Off'}
                          size="small"
                          sx={{
                            backgroundColor: c.old_value ? colors.greenAccent[700] : colors.redAccent[700],
                            color: colors.grey[100],
                            mr: 1
                          }}
                        />
                        <Typography variant="body2" color={colors.grey[100]} sx={{ mx: 1 }}>→</Typography>
                        <Chip
                          label={c.new_value ? 'On' : 'Off'}
                          size="small"
                          sx={{
                            backgroundColor: c.new_value ? colors.greenAccent[700] : colors.redAccent[700],
                            color: colors.grey[100]
                          }}
                        />
                      </Box>
                    ))}
                    {changeIndex < controladorChanges.length - 1 && (
                      <Divider sx={{ my: 1, backgroundColor: colors.primary[200] }} />
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default RecentChanges;
