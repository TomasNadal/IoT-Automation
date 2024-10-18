import React, { useMemo } from 'react';
import { Box, Typography, List, ListItem, ListItemText, useTheme } from '@mui/material';
import { tokens } from '../theme';

const RecentActivityFeed = ({ controladores }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const recentActivity = useMemo(() => {
    return controladores
      .filter(c => c.last_signal)
      .map(c => ({
        id: c.id,
        name: c.name,
        activity: `Last signal at ${new Date(c.last_signal.timestamp).toLocaleString()}`,
      }))
      .slice(0, 5);
  }, [controladores]);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p="30px"
      borderRadius="4px"
      height="100%"
    >
      <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb="15px">
        Recent Activity
      </Typography>
      <List>
        {recentActivity.map((activity, index) => (
          <ListItem key={index} disablePadding>
            <ListItemText
              primary={activity.name}
              secondary={activity.activity}
              primaryTypographyProps={{ color: colors.greenAccent[500] }}
              secondaryTypographyProps={{ color: colors.grey[100] }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default React.memo(RecentActivityFeed);