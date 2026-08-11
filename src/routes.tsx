import { createHashRouter } from "react-router";
import { Navigate } from "react-router";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CurrentFiles from "./pages/CurrentFiles";
import DocumentsMonitor from "./pages/DocumentsMonitor";
import ActivityLogPage from "./pages/ActivityLogPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/app",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="documents-monitor" replace /> },
      { path: "home", element: <Home /> },
      { path: "current-files", element: <CurrentFiles /> },
      { path: "documents-monitor", element: <DocumentsMonitor /> },
      { path: "activity-log", element: <ActivityLogPage /> },
    ],
  },
]);