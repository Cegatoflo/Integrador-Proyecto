import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import contactRoutes from "./routes/contact";
import productRoutes from "./routes/products";
import salesRoutes from "./routes/sales";
import dashboardRoutes from "./routes/dashboard";
import stockEntriesRoutes from "./routes/stockEntries";
import stockRequestsRoutes from "./routes/stockRequests";
import returnsRoutes from "./routes/returns";
import promotionsRoutes from "./routes/promotions";
import customerRoutes from "./routes/customer";

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://127.0.0.1:3004",
].filter(Boolean);

const tunnelOriginPattern = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || (origin && tunnelOriginPattern.test(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/stock-entries", stockEntriesRoutes);
app.use("/api/stock-requests", stockRequestsRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/customers", customerRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
