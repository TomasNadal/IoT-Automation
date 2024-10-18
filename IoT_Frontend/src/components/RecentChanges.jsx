// src/components/RecentChanges.jsx
import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, useTheme } from '@mui/material';
import { tokens } from '../theme';

const RecentChanges = ({ changes }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      backgroundColor={colors.primary[400]}
      p={3}
      borderRadius="4px"
    >
      <Typography variant="h5" mb={2}>Recent Changes</Typography>
      <List>
        {changes.map((change, index) => (
          <ListItem key={index} alignItems="flex-start">
            <ListItemText
              primary={new Date(change.timestamp).toLocaleString()}
              secondary={
                <React.Fragment>
                  {change.changes.map((c, i) => (
                    <Typography
                      key={i}
                      component="span"
                      variant="body2"
                      color={colors.grey[100]}
                    >
                      {`${c.sensor}: ${c.old_value} → ${c.new_value}`}
                      <br />
                    </Typography>
                  ))}
                </React.Fragment>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default RecentChanges;