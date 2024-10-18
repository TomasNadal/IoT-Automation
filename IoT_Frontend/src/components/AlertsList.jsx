import React from 'react';
import { List, ListItem, ListItemText, Typography } from '@mui/material';

const AlertsList = ({ alerts }) => {
  return (
    <List>
      {alerts.map((alert) => (
        <ListItem key={alert.id}>
          <ListItemText
            primary={`Alert for Controller ${alert.id_controlador}`}
            secondary={
              <React.Fragment>
                <Typography component="span" variant="body2" color="text.primary">
                  Configuration:
                </Typography>
                {" " + JSON.stringify(alert.config)}
              </React.Fragment>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default AlertsList;