import { Hono } from "hono";
import church from "./church";
import payment from "./payment";
import connectRoutes from "./connect";
import auth from "./auth";

export const app = new Hono();

// Add CORS middleware
app.use("*", (c, next) => {
  c.header(
    "Access-Control-Allow-Origin",
    "http://localhost:3000, https://demo.goshenpay.com"
  );
  c.header("Access-Control-Allow-Methods", "POST, GET"); // Allow specific methods
  c.header("Access-Control-Allow-Headers", "Content-Type"); // Allow specific headers
  return next();
});

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

export default app;
