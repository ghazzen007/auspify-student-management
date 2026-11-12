import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/public-sans";
import "./styles.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { MetaProvider } from "./hooks/useMeta.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <MetaProvider>
          <App />
        </MetaProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
