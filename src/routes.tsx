import { useRoutes, type RouteObject } from "react-router";
import { App } from "./App";
import { About } from "./About";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/about",
    element: <About />,
  },
];

export function Routes() {
  return useRoutes(routes);
}
