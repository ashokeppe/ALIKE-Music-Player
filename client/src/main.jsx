import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { PlayerProvider } from "./PlayerContext.jsx";
import "./index.css";
import "./extras.css";
import "./theme.css";
import "./mobile.css";
import { mountBackdrop } from "./backdrop.js";

mountBackdrop(); // the animated scenes behind the app

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
