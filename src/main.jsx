import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EVvsGasCalculator from "./EVvsGasCalculator";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EVvsGasCalculator />
  </StrictMode>
);
