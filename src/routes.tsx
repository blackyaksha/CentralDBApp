import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CurrentFiles from "./pages/CurrentFiles";
import Monitoring from "./pages/Monitoring";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/app",
    element: <Layout />,
    children: [
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "current-files",
        element: <CurrentFiles />,
      },
      {
        path: "monitoring",
        element: <Monitoring />,
      },
    ],
  },
]);
