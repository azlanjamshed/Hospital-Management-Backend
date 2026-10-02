const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./modules/auth/auth.routes");
const organizationRoutes = require("./modules/organization/organization.routes");
const organizationStaffRoutes = require("./modules/organization-staff/organization-staff.routes");
const departmentRoutes = require("./modules/Department/department.routes");
const patientRoutes = require("./modules/patient/patient.routes");
const scheduleRoutes = require("./modules/schedule/schedule.routes");
const availabilityRoutes = require("./modules/availability/availability.routes");
const appointmentRoutes = require("./modules/appointment/appointment.routes");
const appointmentWindowRoutes = require("./modules/appointment-window/appointmentWindow.routes");
const queueRoutes = require("./modules/queue/queue.routes");
const consultationRoutes = require("./modules/consultation/consultation.routes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/organization-staff", organizationStaffRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/appointment-windows", appointmentWindowRoutes);
app.use("/api/queue", queueRoutes);
app.use(["/api/consultation", "/api/consultations"], consultationRoutes);
module.exports = app;
