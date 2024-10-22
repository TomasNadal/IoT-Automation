import { useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import Sidebar from "./scenes/global/Sidebar";
import Topbar from "./scenes/global/Topbar";
import { ColorModeContext, useMode } from "./theme";
import Dashboard from "./scenes/dashboard";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from 'react-query/devtools'
import ControllerDetail from "./scenes/controllerDetail/ControllerDetail";
import TestComponent from "./scenes/testScene/testScene";
import AlertsManagement from './scenes/alertsManagement/AlertsManagement';
import CompanyComponents from "./scenes/companyComponents";
import AddControllerPage from './scenes/addController/AddControllerPage';
import AlertNotification from "./components/AlertNotification";
import 'react-tooltip/dist/react-tooltip.css';

const queryClient = new QueryClient();

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
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
                    <Route path="/controller/:id" element={<ControllerDetail />} />
                    <Route path="/empresa/:empresaId/add-controller" element={<AddControllerPage />} />
                    <Route path="/company-components" element={<CompanyComponents />} />
                    <Route path="/test" element = {<TestComponent/>} /> 
                    <Route path="/alerts" element={<AlertsManagement />} />
                    {/* Add more routes here */}
                  </Routes>
                </main>
              </div>
            </ThemeProvider>
          </ColorModeContext.Provider>
        </WebSocketProvider>
      </DataProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;