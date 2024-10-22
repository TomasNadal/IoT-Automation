import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../theme";
import ProgressCircle from "./ProgressCircle";

const StatBox = ({ title, subtitle, icon, progress, increase }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box 
      width="100%" 
      p={2}
      sx={{
        '& > div': {
          maxWidth: '100%',
        }
      }}
    >
      <Box 
        display="flex" 
        justifyContent="space-between"
        alignItems="center"
        minWidth={0}
      >
        <Box flex={1} minWidth={0} mr={2}>
          {icon}
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ 
              color: colors.grey[100],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box flexShrink={0}>
          <ProgressCircle progress={progress} />
        </Box>
      </Box>
      <Box 
        display="flex" 
        justifyContent="space-between"
        alignItems="center"
        mt={1}
        minWidth={0}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            color: colors.greenAccent[500],
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            mr: 1
          }}
        >
          {subtitle}
        </Typography>
        <Typography
          variant="h5"
          fontStyle="italic"
          sx={{ 
            color: colors.greenAccent[600],
            flexShrink: 0
          }}
        >
          {increase}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatBox;