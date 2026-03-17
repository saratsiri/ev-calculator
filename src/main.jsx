import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EVvsGasCalculator from "./EVvsGasCalculator";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EVvsGasCalculator />
  </StrictMode>
);
