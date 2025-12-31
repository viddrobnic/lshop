/* @refresh reload */
import "solid-devtools";
import "@fontsource-variable/inter";
import "./index.css";

import { render } from "solid-js/web";
import { lazy } from "solid-js";
import { Router, Route } from "@solidjs/router";

import { App, AuthenticatedApp } from "./app";
import Home from "./pages/home";
import { GuestGuard } from "./providers/auth";
import Login from "./pages/login";
import Stores from "./pages/stores";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <Router root={App}>
      <Route component={GuestGuard}>
        <Route path="/login" component={Login} />
      </Route>

      <Route component={AuthenticatedApp}>
        <Route path="/" component={Home} />
        <Route path="/stores" component={Stores} />
      </Route>

      <Route path="*" component={lazy(() => import("./errors/404"))} />
    </Router>
  ),
  root!
);
