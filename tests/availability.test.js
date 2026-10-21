const crypto = require("crypto");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const appointmentService = require("../src/modules/appointment/appointment.service");

let server;
let baseUrlAvailability;
let baseUrlAvailabilities;
let baseUrlDocAvail;
let baseUrlDocAvails;

const testTimestamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const randPhone = (p = "9") =>
  `${p}${Math.floor(100000000 + Math.random() * 900000000)}`.slice(0, 10);

let superAdminUser;
let superAdminToken;

let org1;
let org2;

let org1AdminUser;
let org1AdminToken;

let org2AdminUser;
let org2AdminToken;

let org1NurseUser;
let org1NurseToken;

let newPatientUser;
let newPatientRecord;
let newPatientToken;

let doctor1User;
let doctor1;
let doctor1Token;

let doctor2User;
let doctor2;
let doctor2Token;

let doctor3User;
let doctor3;
let doctor3Token;

let dept1;
let dept2;

let futureDateNormal;
let futureDateNoSchedule;
let futureDateClosed;
let futureDateCapacity;

describe("Module 7 — Doctor Availability Management Endpoints", () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrlAvailability = `http://127.0.0.1:${port}/api/availability`;
        baseUrlAvailabilities = `http://127.0.0.1:${port}/api/availabilities`;
        baseUrlDocAvail = `http://127.0.0.1:${port}/api/doctor-availability`;
        baseUrlDocAvails = `http://127.0.0.1:${port}/api/doctor-availabilities`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash("Password123!", 12);

    // 1. Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });
    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: `superadmin.avail.${testTimestamp}@example.com`,
          passwordHash,
          role: "SUPER_ADMIN",
          tokenVersion: 0,
        },
      });
    }

    superAdminToken = jwt.sign(
      {
        userId: superAdminUser.id,
        role: "SUPER_ADMIN",
        tokenVersion: superAdminUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 2. Setup Organizations
    org1 = await prisma.organization.create({
      data: {
        name: `Avail Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `availorg1.${testTimestamp}@example.com`,
        phone: randPhone("91"),
        status: "ACTIVE",
      },
    });

    org2 = await prisma.organization.create({
      data: {
        name: `Avail Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "Asia/Kolkata",
        email: `availorg2.${testTimestamp}@example.com`,
        phone: randPhone("92"),
        status: "ACTIVE",
      },
    });

    // 3. Setup Departments
    dept1 = await prisma.department.create({
      data: {
        organizationId: org1.id,
        name: `Cardiology ${testTimestamp}`,
        status: "ACTIVE",
      },
    });

    dept2 = await prisma.department.create({
      data: {
        organizationId: org1.id,
        name: `Pediatrics ${testTimestamp}`,
        status: "ACTIVE",
      },
    });

    // 4. Setup Org Admins
    org1AdminUser = await prisma.user.create({
      data: {
        name: `Org1 Avail Admin ${testTimestamp}`,
        email: `org1admin.avail.${testTimestamp}@example.com`,
        phone: randPhone("93"),
        passwordHash,
        role: "STAFF",
        tokenVersion: 0,
        memberships: {
          create: {
            organizationId: org1.id,
            role: "ADMIN",
            status: "ACTIVE",
          },
        },
      },
    });

    org1AdminToken = jwt.sign(
      {
        userId: org1AdminUser.id,
        role: "STAFF",
        tokenVersion: org1AdminUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    org2AdminUser = await prisma.user.create({
      data: {
        name: `Org2 Avail Admin ${testTimestamp}`,
        email: `org2admin.avail.${testTimestamp}@example.com`,
        phone: randPhone("94"),
        passwordHash,
        role: "STAFF",
        tokenVersion: 0,
        memberships: {
          create: {
            organizationId: org2.id,
            role: "ADMIN",
            status: "ACTIVE",
          },
        },
      },
    });

    org2AdminToken = jwt.sign(
      {
        userId: org2AdminUser.id,
        role: "STAFF",
        tokenVersion: org2AdminUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 5. Setup Nurse for Org1
    org1NurseUser = await prisma.user.create({
      data: {
        name: `Org1 Avail Nurse ${testTimestamp}`,
        email: `org1nurse.avail.${testTimestamp}@example.com`,
        phone: randPhone("99"),
        passwordHash,
        role: "STAFF",
        tokenVersion: 0,
        memberships: {
          create: {
            organizationId: org1.id,
            role: "NURSE",
            status: "ACTIVE",
          },
        },
      },
    });

    org1NurseToken = jwt.sign(
      {
        userId: org1NurseUser.id,
        role: "STAFF",
        tokenVersion: org1NurseUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 6. Setup New Patient (has NO PatientOrganization link!)
    newPatientUser = await prisma.user.create({
      data: {
        name: `New Patient ${testTimestamp}`,
        email: `newpatient.avail.${testTimestamp}@example.com`,
        phone: randPhone("95"),
        passwordHash,
        role: "PATIENT",
        tokenVersion: 0,
      },
    });

    newPatientRecord = await prisma.patient.create({
      data: {
        userId: newPatientUser.id,
        name: `New Patient ${testTimestamp}`,
        gender: "FEMALE",
        dateOfBirth: new Date("1996-03-15"),
      },
    });

    newPatientToken = jwt.sign(
      {
        userId: newPatientUser.id,
        role: "PATIENT",
        tokenVersion: newPatientUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 7. Setup Doctors
    doctor1User = await prisma.user.create({
      data: {
        name: `Doctor One ${testTimestamp}`,
        email: `doctor1.avail.${testTimestamp}@example.com`,
        phone: randPhone("96"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor1 = await prisma.doctor.create({
      data: {
        userId: doctor1User.id,
        organizationId: org1.id,
        name: `Dr. One ${testTimestamp}`,
        qualification: "MBBS, MD Cardiology",
        consultationFeeMinor: 50000,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
        departments: {
          create: {
            departmentId: dept1.id,
          },
        },
      },
    });

    doctor1Token = jwt.sign(
      {
        userId: doctor1User.id,
        role: "DOCTOR",
        tokenVersion: doctor1User.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    doctor2User = await prisma.user.create({
      data: {
        name: `Doctor Two ${testTimestamp}`,
        email: `doctor2.avail.${testTimestamp}@example.com`,
        phone: randPhone("97"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor2 = await prisma.doctor.create({
      data: {
        userId: doctor2User.id,
        organizationId: org1.id,
        name: `Dr. Two ${testTimestamp}`,
        qualification: "MBBS, MD Pediatrics",
        consultationFeeMinor: 40000,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
        departments: {
          create: {
            departmentId: dept2.id,
          },
        },
      },
    });

    doctor2Token = jwt.sign(
      {
        userId: doctor2User.id,
        role: "DOCTOR",
        tokenVersion: doctor2User.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    doctor3User = await prisma.user.create({
      data: {
        name: `Doctor Three ${testTimestamp}`,
        email: `doctor3.avail.${testTimestamp}@example.com`,
        phone: randPhone("98"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor3 = await prisma.doctor.create({
      data: {
        userId: doctor3User.id,
        organizationId: org2.id,
        name: `Dr. Three ${testTimestamp}`,
        qualification: "MS Ortho",
        consultationFeeMinor: 60000,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
    });

    doctor3Token = jwt.sign(
      {
        userId: doctor3User.id,
        role: "DOCTOR",
        tokenVersion: doctor3User.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Setup schedules:
    // Doctor 1 has recurring schedule every day (weekdays 0-6) 09:00 - 17:00
    for (let day = 0; day <= 6; day++) {
      await prisma.schedule.create({
        data: {
          doctorId: doctor1.id,
          weekday: day,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    }

    // Doctor 2 has recurring schedule ONLY on Monday (weekday = 1)
    await prisma.schedule.create({
      data: {
        doctorId: doctor2.id,
        weekday: 1,
        startTime: "10:00",
        endTime: "14:00",
      },
    });

    // Test dates:
    // Future Date Normal (30 days from now)
    const d1 = new Date();
    d1.setDate(d1.getDate() + 30);
    futureDateNormal = d1.toISOString().split("T")[0];

    // Future Date Capacity test (35 days from now)
    const d2 = new Date();
    d2.setDate(d2.getDate() + 35);
    futureDateCapacity = d2.toISOString().split("T")[0];

    // Future Date Closed window (40 days from now)
    const d3 = new Date();
    d3.setDate(d3.getDate() + 40);
    futureDateClosed = d3.toISOString().split("T")[0];

    // Find a future date that is NOT Monday (weekday != 1) to test doctor2 having no schedule
    const d4 = new Date();
    d4.setDate(d4.getDate() + 30);
    while (d4.getUTCDay() === 1) {
      d4.setDate(d4.getDate() + 1);
    }
    futureDateNoSchedule = d4.toISOString().split("T")[0];

    // Create a CLOSED AppointmentWindow for Doctor 1 on futureDateClosed
    const closedDate = new Date(futureDateClosed);
    closedDate.setUTCHours(0, 0, 0, 0);
    await prisma.appointmentWindow.create({
      data: {
        organizationId: org1.id,
        doctorId: doctor1.id,
        date: closedDate,
        startTime: "09:00",
        endTime: "17:00",
        status: "CLOSED",
      },
    });

    // Create an AppointmentWindow with capacity = 2 for Doctor 1 on futureDateCapacity
    const capDate = new Date(futureDateCapacity);
    capDate.setUTCHours(0, 0, 0, 0);
    await prisma.appointmentWindow.create({
      data: {
        organizationId: org1.id,
        doctorId: doctor1.id,
        date: capDate,
        startTime: "09:00",
        endTime: "17:00",
        capacity: 2,
        status: "OPEN",
      },
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. LIST AVAILABLE DOCTORS (GET /:organizationId/doctors)
  // =========================================================================
  describe("List Available Doctors (GET /:organizationId/doctors)", () => {
    it("should allow a new patient without existing PatientOrganization link to discover available doctors", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 1);

      // Doctor 1 should be listed as available
      const doc1 = json.data.find((d) => d.id === doctor1.id);
      assert.ok(doc1);
      assert.equal(doc1.available, true);
      assert.ok(doc1.departments.some((d) => d.name.includes("Cardiology")));
    });

    it("should filter available doctors by departmentId", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}&departmentId=${dept1.id}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.every((d) => d.departments.some((dep) => dep.id === dept1.id)));
    });

    it("should filter available doctors by search query (name or qualification)", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}&search=Cardiology`,
        {
          headers: {
            Authorization: `Bearer ${org1NurseToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(json.data.some((d) => d.id === doctor1.id));
    });

    it("should support availableOnly=true filter to exclude doctors without working schedule on that date", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNoSchedule}&availableOnly=true`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      // Doctor 2 does NOT have a schedule on this weekday, so should not be in availableOnly list
      assert.equal(json.data.some((d) => d.id === doctor2.id), false);
    });

    it("should support pagination (page and limit)", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}&page=1&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(json.pagination);
      assert.equal(json.pagination.page, 1);
      assert.equal(json.pagination.limit, 1);
      assert.equal(json.data.length, 1);
    });

    it("should reject cross-tenant listing (Org2 Admin accessing Org1 doctors) with 403", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${org2AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 403);
    });

    it("should return 404 for non-existent organization", async () => {
      const fakeOrgId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrlAvailability}/${fakeOrgId}/doctors?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
          },
        },
      );

      assert.equal(res.status, 404);
    });

    it("should reject invalid UUID parameters with 400", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/invalid-uuid-format/doctors?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject missing date query with 400", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors?date=${futureDateNormal}`,
      );

      assert.equal(res.status, 401);
    });
  });

  // =========================================================================
  // 2. DOCTOR-SPECIFIC AVAILABILITY (GET /:orgId/doctors/:docId)
  // =========================================================================
  describe("Doctor Date-Specific Availability", () => {
    it("should return available = true for a doctor with a valid recurring schedule and open window", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.available, true);
      assert.equal(json.data.doctorId, doctor1.id);
      assert.ok(json.data.startTime);
      assert.ok(json.data.endTime);
      assert.ok(Array.isArray(json.data.windows));
      assert.ok(json.data.windows.length >= 1);
      assert.equal(json.data.windows[0].available, true);
    });

    it("should support retrieval via legacy /availability sub-resource URL", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}/availability?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.available, true);
    });

    it("should return available = false when doctor has no recurring schedule on the requested day", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor2.id}?date=${futureDateNoSchedule}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, false);
      assert.ok(json.data.reason.includes("no recurring schedule"));
    });

    it("should return available = false when AppointmentWindow is CLOSED", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateClosed}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, false);
      assert.ok(json.data.reason.includes("closed"));
      assert.equal(json.data.windows[0].available, false);
      assert.equal(json.data.windows[0].status, "CLOSED");
    });

    it("should return available = false for dates in the past", async () => {
      const pastDate = "2020-01-01";
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${pastDate}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, false);
      assert.ok(json.data.reason.includes("past"));
    });

    it("should return available = false when doctor availabilityStatus is not AVAILABLE (e.g. ON_LUNCH, UNAVAILABLE)", async () => {
      // Temporarily set doctor1 availabilityStatus to ON_LUNCH
      await prisma.doctor.update({
        where: { id: doctor1.id },
        data: { availabilityStatus: "ON_LUNCH" },
      });

      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, false);
      assert.equal(json.data.doctorAvailabilityStatus, "ON_LUNCH");
      assert.ok(json.data.reason.includes("ON_LUNCH"));

      // Restore doctor1 availabilityStatus to AVAILABLE
      await prisma.doctor.update({
        where: { id: doctor1.id },
        data: { availabilityStatus: "AVAILABLE" },
      });
    });

    it("should return 404 for non-existent doctor ID", async () => {
      const fakeDocId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${fakeDocId}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 404);
    });

    it("should return 404 when doctorId belongs to a different organization", async () => {
      // Doctor 3 belongs to Org2, requested under Org1 URL
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor3.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
          },
        },
      );

      assert.equal(res.status, 404);
    });
  });

  // =========================================================================
  // 3. CAPACITY ACCOUNTING: PENDING & CONFIRMED RESERVATIONS
  // =========================================================================
  describe("Capacity Accounting: PENDING, CONFIRMED, and Window FULL", () => {
    let appointment1;
    let appointment2;

    it("should report initial capacity = 2 and remainingCapacity = 2", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateCapacity}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, true);
      assert.equal(json.data.capacity, 2);
      assert.equal(json.data.appointmentCount, 0);
      assert.equal(json.data.remainingCapacity, 2);
    });

    it("should account for CONFIRMED appointment: remainingCapacity decrements to 1", async () => {
      // Book 1st appointment (CONFIRMED)
      const booking = await appointmentService.createAppointment({
        organizationId: org1.id,
        patientId: newPatientRecord.id,
        doctorId: doctor1.id,
        appointmentDate: futureDateCapacity,
        paymentMethod: "PAY_AT_HOSPITAL",
        source: "STAFF",
      });

      appointment1 = booking.appointment;
      assert.equal(appointment1.status, "CONFIRMED");

      // Verify availability
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateCapacity}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, true);
      assert.equal(json.data.capacity, 2);
      assert.equal(json.data.appointmentCount, 1);
      assert.equal(json.data.remainingCapacity, 1);
    });

    it("should account for PENDING appointment: remainingCapacity reaches 0 and available becomes false", async () => {
      // Create 2nd patient
      const p2User = await prisma.user.create({
        data: {
          name: `Patient Two ${testTimestamp}`,
          email: `p2.avail.${testTimestamp}@example.com`,
          phone: randPhone("81"),
          passwordHash: await bcrypt.hash("Password123!", 12),
          role: "PATIENT",
          tokenVersion: 0,
        },
      });

      const p2Record = await prisma.patient.create({
        data: {
          userId: p2User.id,
          name: `Patient Two ${testTimestamp}`,
          gender: "MALE",
          dateOfBirth: new Date("1990-01-01"),
        },
      });

      // Book 2nd appointment with ONLINE payment (status: PENDING)
      const booking2 = await appointmentService.createAppointment({
        organizationId: org1.id,
        patientId: p2Record.id,
        doctorId: doctor1.id,
        appointmentDate: futureDateCapacity,
        paymentMethod: "ONLINE",
        source: "PATIENT_APP",
      });

      appointment2 = booking2.appointment;
      assert.equal(appointment2.status, "PENDING");

      // Verify availability: capacity exhausted (2/2) -> available: false, remainingCapacity: 0
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateCapacity}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, false);
      assert.equal(json.data.capacity, 2);
      assert.equal(json.data.appointmentCount, 2);
      assert.equal(json.data.remainingCapacity, 0);
    });

    it("should restore remainingCapacity and available status when an appointment is cancelled", async () => {
      // Cancel the second appointment
      await appointmentService.cancelAppointment({
        organizationId: org1.id,
        appointmentId: appointment2.id,
        cancelledBy: "PATIENT",
        reason: "Schedule change",
      });

      // Verify capacity is restored to 1 and available is true again
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateCapacity}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, true);
      assert.equal(json.data.remainingCapacity, 1);
      assert.equal(json.data.appointmentCount, 1);
    });
  });

  // =========================================================================
  // 4. DOCTOR SELF-MANAGEMENT & ROLE ISOLATION
  // =========================================================================
  describe("Doctor Self-Management & Cross-Tenant Access Restrictions", () => {
    it("should allow Doctor 1 to check their own availability", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.doctorId, doctor1.id);
    });

    it("should reject Doctor 1 attempting to access Doctor 2's availability with 403", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor2.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
          },
        },
      );

      assert.equal(res.status, 403);
    });

    it("should reject cross-tenant access: Org2 Admin querying Org1 doctor availability with 403", async () => {
      const res = await fetch(
        `${baseUrlAvailability}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${org2AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // 5. COMPATIBILITY & DUAL-MOUNT VERIFICATION
  // =========================================================================
  describe("Dual-Mount & Backward-Compatibility (/api/doctor-availability & plural routes)", () => {
    it("should allow querying availability via /api/doctor-availability identically", async () => {
      const res = await fetch(
        `${baseUrlDocAvail}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.available, true);
      assert.equal(json.data.doctorId, doctor1.id);
    });

    it("should allow listing doctors via /api/doctor-availability/:orgId/doctors identically", async () => {
      const res = await fetch(
        `${baseUrlDocAvail}/${org1.id}/doctors?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    it("should support plural mount /api/availabilities", async () => {
      const res = await fetch(
        `${baseUrlAvailabilities}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, true);
    });

    it("should support plural mount /api/doctor-availabilities", async () => {
      const res = await fetch(
        `${baseUrlDocAvails}/${org1.id}/doctors/${doctor1.id}?date=${futureDateNormal}`,
        {
          headers: {
            Authorization: `Bearer ${newPatientToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.available, true);
    });
  });
});
