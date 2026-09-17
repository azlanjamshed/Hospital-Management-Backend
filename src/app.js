const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./modules/auth/auth.routes");

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Clinic backend is running",
  });
});

app.use("/api/auth", authRoutes);
module.exports = app;
