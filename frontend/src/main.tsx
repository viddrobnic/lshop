import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "@/app";
import "./index.css";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
