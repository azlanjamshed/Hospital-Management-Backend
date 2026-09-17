const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./modules/auth/auth.routes");
const organizationRoutes = require("./modules/organization/organization.routes");
const organizationStaffRoutes = require("./modules/organization-staff/organization-staff.routes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/organization-staff", organizationStaffRoutes);

module.exports = app;
