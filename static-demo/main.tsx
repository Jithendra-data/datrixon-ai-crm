import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import Workspace from "../components/crm/workspace";
import { installDemoTransport } from "../lib/crm/transport";
import "../app/globals.css";
import "./pages.css";

installDemoTransport(async (path, body) =>
  (await import("./demo-api")).demoApi(path, body),
);
function App() {
  const [route, setRoute] = useState(location.hash.slice(1));
  useEffect(() => {
    const navigate = () => {
      setRoute(location.hash.slice(1));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const [, section, view = "overview", recordId] = route.split("/");
  return (
    <>
      <div className="pages-notice">
        <strong>Interactive portfolio demo</strong>
        <span>
          Browser-local synthetic data · No secure login or shared backend ·
          Changes stay in this tab
        </span>
        <a href="https://github.com/Jithendra-data/datrixon-ai-crm">
          Source & server edition ↗
        </a>
      </div>
      {section === "workspace" ? (
        <Workspace key={route} view={view} recordId={recordId} />
      ) : (
        <Home />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
