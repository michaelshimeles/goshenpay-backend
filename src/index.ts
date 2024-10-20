import { Hono } from "hono";
import church from "./church";
import payment from "./payment";
import connectRoutes from "./connect";
import auth from "./auth";
// import analytics from "./analytics"

export const app = new Hono();

// Home endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Welcome to the GoshenPay API",
  });
});

app.route("/church", church);
app.route("/payment", payment);
app.route("/connect", connectRoutes);
app.route("/auth", auth);
// app.route("/analytics", analytics);

export default app;
