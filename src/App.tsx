import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </TooltipProvider>
);

export default App;
