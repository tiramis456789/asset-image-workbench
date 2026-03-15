import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener("error", (event) => {
  console.error("window-error", event.message, event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("unhandled-rejection", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
