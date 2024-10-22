import { Box, IconButton, useTheme, Badge, Drawer, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useContext, useState, useEffect } from "react";
import { ColorModeContext, tokens } from "../../theme";
import InputBase from "@mui/material/InputBase";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { WebSocketContext } from "../../context/WebSocketContext";

const Topbar = ({ setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const { socket } = useContext(WebSocketContext);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);

  useEffect(() => {
    if (socket) {
      console.log("Setting up alert listener in Topbar");
      
      socket.on('alert_triggered', (data) => {
        console.log('Received alert in Topbar:', data);
        const newNotification = {
          id: Date.now(),
          title: data.alert.name,
          message: `${data.log.sensor_name}: ${data.log.old_value ? 'ON' : 'OFF'} → ${data.log.new_value ? 'ON' : 'OFF'}`,
          timestamp: new Date(),
          read: false,
          ...data
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('alert_triggered');
      };
    }
  }, [socket]);

  return (
    <>
      <Box display="flex" justifyContent="space-between" p={2}>
        {/* Menu Icon */}
        <IconButton onClick={() => setIsSidebar(prev => !prev)}>
          <MenuIcon />
        </IconButton>

        {/* SEARCH BAR */}
        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          ml={2}
        >
          <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" />
          <IconButton type="button" sx={{ p: 1 }}>
            <SearchIcon />
          </IconButton>
        </Box>

        {/* ICONS */}
        <Box display="flex">
          <IconButton onClick={colorMode.toggleColorMode}>
            {theme.palette.mode === "dark" ? (
              <DarkModeOutlinedIcon />
            ) : (
              <LightModeOutlinedIcon />
            )}
          </IconButton>
          <IconButton onClick={() => setOpenDrawer(true)}>
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
              <NotificationsOutlinedIcon />
            </Badge>
          </IconButton>
          <IconButton>
            <SettingsOutlinedIcon />
          </IconButton>
          <IconButton>
            <PersonOutlinedIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => {
          setOpenDrawer(false);
          setUnreadCount(0);
          setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        }}
      >
        <Box
          sx={{
            width: 350,
            backgroundColor: colors.primary[400],
            height: '100%',
          }}
        >
          <Box
            p={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`1px solid ${colors.primary[300]}`}
          >
            <Typography variant="h5">Notificaciones</Typography>
            <IconButton 
              onClick={() => {
                setNotifications([]);
                setUnreadCount(0);
              }}
              sx={{ color: colors.grey[100] }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No hay notificaciones"
                  sx={{ textAlign: 'center', color: colors.grey[400] }}
                />
              </ListItem>
            ) : (
              notifications.map(notification => (
                <ListItem 
                  key={notification.id}
                  sx={{
                    backgroundColor: notification.read ? 'inherit' : colors.primary[300],
                    borderBottom: `1px solid ${colors.primary[300]}`
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" color={colors.greenAccent[500]}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color={colors.grey[100]}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color={colors.grey[300]}>
                          {new Date(notification.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Topbar;