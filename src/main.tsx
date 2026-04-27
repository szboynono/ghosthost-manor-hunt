import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import App from "./App";
import { initDiscord } from "./discord/discordSdk";

// Kick off Discord SDK init before first render; app renders in parallel.
// Status is exposed to components via useDiscordActivity().
void initDiscord();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
