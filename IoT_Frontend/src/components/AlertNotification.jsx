import React, { useState, useEffect, useContext } from 'react';
import {
  Snackbar,
  Alert as MuiAlert,
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Badge,
  useTheme,
} from '@mui/material';
import { WebSocketContext } from '../context/WebSocketContext';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import { tokens } from '../theme';

const AlertNotification = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { socket } = useContext(WebSocketContext);
  const [notifications, setNotifications] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (socket) {
      socket.on('alert_triggered', (data) => {
        const newNotification = {
          id: Date.now(),
          timestamp: new Date(),
          ...data,
          read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        setCurrentAlert(newNotification);
        setOpenSnackbar(true);
      });

      return () => {
        socket.off('alert_triggered');
      };
    }
  }, [socket]);

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    setUnreadCount(0);
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Notification Icon */}
      <Box 
        position="fixed" 
        right={20} 
        top={20} 
        zIndex={2000}
        sx={{
          '& .MuiIconButton-root': {
            color: colors.greenAccent[500],
            '&:hover': {
              backgroundColor: colors.primary[400]
            }
          }
        }}
      >
        <IconButton onClick={handleOpenDrawer}>
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: colors.redAccent[500],
                color: colors.primary[100]
              }
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>

      {/* Alert Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity="warning"
          onClose={handleCloseSnackbar}
          sx={{
            backgroundColor: colors.greenAccent[600],
            color: colors.primary[100],
            '.MuiAlert-icon': {
              color: colors.primary[100]
            }
          }}
        >
          {currentAlert && (
            <Box>
              <Typography 
                variant="subtitle1"
                sx={{ color: colors.primary[100] }}
              >
                {currentAlert.alert.name}
              </Typography>
              <Typography 
                variant="body2"
                sx={{ color: colors.primary[200] }}
              >
                {`${currentAlert.log.sensor_name}: ${currentAlert.log.old_value ? 'ON' : 'OFF'} → ${currentAlert.log.new_value ? 'ON' : 'OFF'}`}
              </Typography>
            </Box>
          )}
        </MuiAlert>
      </Snackbar>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          sx={{
            width: 350,
            backgroundColor: colors.primary[400],
            height: '100%',
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            borderBottom={1}
            borderColor={colors.primary[300]}
          >
            <Typography 
              variant="h5" 
              color={colors.grey[100]}
              fontWeight="bold"
            >
              Notifications
            </Typography>
            <IconButton 
              onClick={handleClearNotifications}
              sx={{ color: colors.grey[100] }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  backgroundColor: notification.read ? 'inherit' : colors.primary[300],
                  borderBottom: 1,
                  borderColor: colors.primary[300],
                  '&:hover': {
                    backgroundColor: colors.primary[500],
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography color={colors.greenAccent[500]}>
                      {notification.alert.name}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color={colors.grey[100]}>
                        {`${notification.log.sensor_name}: ${notification.log.old_value ? 'ON' : 'OFF'} → ${notification.log.new_value ? 'ON' : 'OFF'}`}
                      </Typography>
                      <Typography variant="caption" color={colors.grey[300]}>
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {notifications.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No notifications"
                  sx={{ 
                    textAlign: 'center', 
                    color: colors.grey[400],
                    fontStyle: 'italic'
                  }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default AlertNotification;