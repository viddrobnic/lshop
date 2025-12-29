/* @refresh reload */
import "solid-devtools";
import "./index.css";

import { render } from "solid-js/web";
import { lazy } from "solid-js";
import { Router, Route } from "@solidjs/router";

import App from "./app";
import Home from "./pages/home";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Home} />
      <Route path="/about" component={lazy(() => import("./pages/about"))} />
      <Route path="*" component={lazy(() => import("./errors/404"))} />
    </Router>
  ),
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  root!
);
