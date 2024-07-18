import { useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import Sidebar from "./scenes/global/Sidebar";
import Topbar from "./scenes/global/Topbar";
import { ColorModeContext, useMode } from "./theme";
import Dashboard from "./scenes/dashboard";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { WebSocketProvider } from "./context/WebSocketContext";

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <DataProvider>
      <WebSocketProvider>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="app">
              <Sidebar isSidebar={isSidebar} />
              <main className="content">
                <Topbar setIsSidebar={setIsSidebar} />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  {/* Add more routes here */}
                </Routes>
              </main>
            </div>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </WebSocketProvider>
    </DataProvider>
  );
}

export default App;
