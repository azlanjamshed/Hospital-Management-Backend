const express = require("express");
const cors = require("cors");

const app = express();
const clinicRoutes = require("./modules/clinic/clinic.routes");

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Clinic backend is running",
  });
});
app.use("/api/clinics", clinicRoutes);
module.exports = app;
