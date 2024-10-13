import { Hono } from "hono";
import church from "./church";

export const app = new Hono();

// Add CORS middleware
app.use("*", (c, next) => {
  c.header(
    "Access-Control-Allow-Origin",
    "http://localhost:3000, https://demo.goshenpay.com"
  );
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT"); // Allow specific methods
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

export default app;
