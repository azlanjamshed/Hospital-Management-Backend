const crypto = require("crypto");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const appointmentService = require("../src/modules/appointment/appointment.service");

let server;
let baseUrlPlural;
let baseUrlSingular;
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

let patientUser;
let patientToken;
let patientRecord;

let doctor1User;
let doctor1;
let doctor1Token;

let doctor2User;
let doctor2;
let doctor2Token;

let doctor3User;
let doctor3;
let doctor3Token;

let sharedWindow1Id;
let futureDate1;
let futureDate2;
let futureDate3;

describe("Module 6 — Appointment Window Management Endpoints", () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrlPlural = `http://127.0.0.1:${port}/api/appointment-windows`;
        baseUrlSingular = `http://127.0.0.1:${port}/api/appointment-window`;
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
          email: `superadmin.win.${testTimestamp}@example.com`,
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
        name: `Window Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `winorg1.${testTimestamp}@example.com`,
        phone: randPhone("91"),
        status: "ACTIVE",
      },
    });

    org2 = await prisma.organization.create({
      data: {
        name: `Window Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "Asia/Kolkata",
        email: `winorg2.${testTimestamp}@example.com`,
        phone: randPhone("92"),
        status: "ACTIVE",
      },
    });

    // 3. Setup Org Admins
    org1AdminUser = await prisma.user.create({
      data: {
        name: `Org1 Admin ${testTimestamp}`,
        email: `org1admin.win.${testTimestamp}@example.com`,
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
        name: `Org2 Admin ${testTimestamp}`,
        email: `org2admin.win.${testTimestamp}@example.com`,
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

    // 4. Setup Nurse for Org1
    org1NurseUser = await prisma.user.create({
      data: {
        name: `Org1 Nurse ${testTimestamp}`,
        email: `org1nurse.win.${testTimestamp}@example.com`,
        passwordHash,
        role: "STAFF",
        tokenVersion: 0,
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org1.id,
        userId: org1NurseUser.id,
        role: "NURSE",
        status: "ACTIVE",
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

    // 5. Setup Patient
    patientUser = await prisma.user.create({
      data: {
        name: `Patient Window ${testTimestamp}`,
        email: `patient.win.${testTimestamp}@example.com`,
        phone: randPhone("95"),
        passwordHash,
        role: "PATIENT",
        tokenVersion: 0,
      },
    });

    patientRecord = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        name: `Patient Window ${testTimestamp}`,
        gender: "MALE",
        dateOfBirth: new Date("1995-01-01"),
      },
    });

    patientToken = jwt.sign(
      {
        userId: patientUser.id,
        role: "PATIENT",
        tokenVersion: patientUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 6. Setup Doctors
    doctor1User = await prisma.user.create({
      data: {
        name: `Doctor 1 ${testTimestamp}`,
        email: `doctor1.win.${testTimestamp}@example.com`,
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
        qualification: "MBBS, MD",
        consultationFeeMinor: 50000,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
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
        name: `Doctor 2 ${testTimestamp}`,
        email: `doctor2.win.${testTimestamp}@example.com`,
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
        qualification: "MBBS, DCH",
        consultationFeeMinor: 60000,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
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
        name: `Doctor 3 ${testTimestamp}`,
        email: `doctor3.win.${testTimestamp}@example.com`,
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
        consultationFeeMinor: 70000,
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

    // Setup base recurring schedules for doctors across all 7 weekdays
    for (let day = 0; day <= 6; day++) {
      await prisma.schedule.create({
        data: {
          doctorId: doctor1.id,
          weekday: day,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
      await prisma.schedule.create({
        data: {
          doctorId: doctor2.id,
          weekday: day,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    }

    // Set future test dates
    const d1 = new Date();
    d1.setDate(d1.getDate() + 30);
    futureDate1 = d1.toISOString().split("T")[0];

    const d2 = new Date();
    d2.setDate(d2.getDate() + 31);
    futureDate2 = d2.toISOString().split("T")[0];

    const d3 = new Date();
    d3.setDate(d3.getDate() + 32);
    futureDate3 = d3.toISOString().split("T")[0];
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. CREATE OR UPSERT APPOINTMENT WINDOWS
  // =========================================================================
  describe("Create or Upsert Appointment Window (POST)", () => {
    it("should allow Org1 Admin to create an appointment window for Doctor 1", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate1,
            startTime: "09:00",
            endTime: "13:00",
            capacity: 10,
            status: "OPEN",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(json.data.id);
      assert.equal(json.data.doctorId, doctor1.id);
      assert.equal(json.data.capacity, 10);
      assert.equal(json.data.status, "OPEN");

      sharedWindow1Id = json.data.id;
    });

    it("should allow Doctor 1 to upsert their own appointment window (modifying capacity and time)", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/windows`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({
            date: futureDate1,
            startTime: "09:00",
            endTime: "14:00",
            capacity: 15,
            status: "OPEN",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.id, sharedWindow1Id);
      assert.equal(json.data.capacity, 15);
      assert.equal(json.data.endTime, "14:00");
    });

    it("should allow SUPER_ADMIN to create window for any doctor", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor2.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${superAdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate2,
            startTime: "10:00",
            endTime: "12:00",
            capacity: 5,
            status: "OPEN",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.doctorId, doctor2.id);
    });

    it("should reject Doctor 1 attempting to create window for Doctor 2 with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor2.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "09:00",
            endTime: "12:00",
            capacity: 5,
          }),
        },
      );

      assert.equal(res.status, 403);
    });

    it("should reject cross-tenant creation (Org2 Admin trying to create in Org1) with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org2AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "09:00",
            endTime: "12:00",
            capacity: 5,
          }),
        },
      );

      assert.equal(res.status, 403);
    });

    it("should reject patient creating window with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${patientToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "09:00",
            endTime: "12:00",
            capacity: 5,
          }),
        },
      );

      assert.equal(res.status, 403);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "09:00",
            endTime: "12:00",
          }),
        },
      );

      assert.equal(res.status, 401);
    });

    it("should reject request for non-existent doctor with 404", async () => {
      const fakeDocId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${fakeDocId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "09:00",
            endTime: "12:00",
          }),
        },
      );

      assert.equal(res.status, 404);
    });

    it("should reject invalid body (endTime <= startTime) with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            startTime: "14:00",
            endTime: "09:00",
            capacity: 5,
          }),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject invalid body (negative capacity) with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
            capacity: -5,
          }),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject invalid UUID parameters with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/not-a-valid-uuid`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: futureDate3,
          }),
        },
      );

      assert.equal(res.status, 400);
    });
  });

  // =========================================================================
  // 2. LIST APPOINTMENT WINDOWS
  // =========================================================================
  describe("List Appointment Windows (GET)", () => {
    it("should allow Doctor 1 to list their own windows", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 1);
      assert.equal(json.data[0].doctorId, doctor1.id);
      assert.equal(typeof json.data[0].activeBookingsCount, "number");
    });

    it("should allow Org1 Nurse to list windows for Doctor 1 via legacy /windows path", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/windows`,
        {
          headers: {
            Authorization: `Bearer ${org1NurseToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    it("should filter windows by date range (startDate & endDate)", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}?startDate=${futureDate1}&endDate=${futureDate1}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.length, 1);
      assert.equal(json.data[0].id, sharedWindow1Id);
    });

    it("should filter windows by status", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}?status=OPEN`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(json.data.every((w) => w.status === "OPEN"));
    });

    it("should support pagination (page and limit)", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}?page=1&limit=5`,
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
      assert.equal(json.pagination.limit, 5);
      assert.ok(Array.isArray(json.data));
    });

    it("should reject cross-tenant listing with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          headers: {
            Authorization: `Bearer ${org2AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 403);
    });

    it("should reject unauthenticated listing with 401", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
      );

      assert.equal(res.status, 401);
    });
  });

  // =========================================================================
  // 3. GET APPOINTMENT WINDOW BY ID
  // =========================================================================
  describe("Get Appointment Window by ID (GET /:windowId)", () => {
    it("should allow Org1 Admin to retrieve window by ID with active bookings count", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.id, sharedWindow1Id);
      assert.equal(json.data.doctorId, doctor1.id);
      assert.equal(typeof json.data.activeBookingsCount, "number");
      assert.ok(Array.isArray(json.data.appointments));
    });

    it("should allow retrieval via legacy /windows/:windowId path", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/windows/${sharedWindow1Id}`,
        {
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.id, sharedWindow1Id);
    });

    it("should return 404 for non-existent windowId", async () => {
      const fakeWinId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${fakeWinId}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 404);
    });

    it("should return 404 when windowId belongs to a different doctor", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor2.id}/${sharedWindow1Id}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      assert.equal(res.status, 404);
    });

    it("should reject cross-tenant access to window by ID with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
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
  // 4. UPDATE APPOINTMENT WINDOW
  // =========================================================================
  describe("Update Appointment Window (PATCH /:windowId)", () => {
    it("should allow Doctor 1 to update their window's capacity and start/end time", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({
            capacity: 20,
            startTime: "09:30",
            endTime: "13:30",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.capacity, 20);
      assert.equal(json.data.startTime, "09:30");
      assert.equal(json.data.endTime, "13:30");
    });

    it("should reject empty update body with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({}),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject invalid time range (endTime <= startTime) with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            startTime: "15:00",
            endTime: "10:00",
          }),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject cross-tenant window update with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org2AdminToken}`,
          },
          body: JSON.stringify({
            capacity: 25,
          }),
        },
      );

      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // 5. UPDATE APPOINTMENT WINDOW STATUS
  // =========================================================================
  describe("Update Appointment Window Status (PATCH /:windowId/status)", () => {
    it("should allow Org1 Admin to toggle status to CLOSED", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            status: "CLOSED",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.status, "CLOSED");
    });

    it("should allow Doctor 1 to toggle status back to OPEN via legacy /windows path", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/windows/${sharedWindow1Id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({
            status: "OPEN",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.status, "OPEN");
    });

    it("should reject invalid status value with 400", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            status: "INVALID_STATUS",
          }),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject cross-tenant status update with 403", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${sharedWindow1Id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org2AdminToken}`,
          },
          body: JSON.stringify({
            status: "CLOSED",
          }),
        },
      );

      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // 6. CAPACITY VALIDATION, OVERBOOKING PREVENTION & APPOINTMENT ACCOUNTING
  // =========================================================================
  describe("Capacity Validation, Overbooking Prevention & Booking Accounting", () => {
    let capacityWindowId;
    let appointment1Id;
    let appointment2Id;
    let capacityTestDate;

    before(async () => {
      const d = new Date();
      d.setDate(d.getDate() + 45);
      capacityTestDate = d.toISOString().split("T")[0];

      // Create window with capacity = 2
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: capacityTestDate,
            startTime: "09:00",
            endTime: "12:00",
            capacity: 2,
            status: "OPEN",
          }),
        },
      );
      const json = await res.json();
      capacityWindowId = json.data.id;
    });

    it("should account for active appointments: booking 1st appointment (CONFIRMED)", async () => {
      // Create confirmed appointment via appointment service
      const booking1 = await appointmentService.createAppointment({
        organizationId: org1.id,
        patientId: patientRecord.id,
        doctorId: doctor1.id,
        appointmentDate: capacityTestDate,
        paymentMethod: "PAY_AT_HOSPITAL",
        source: "STAFF",
      });

      appointment1Id = booking1.appointment.id;
      assert.equal(booking1.appointment.status, "CONFIRMED");

      // Verify activeBookingsCount = 1 and status remains OPEN
      const winRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${capacityWindowId}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );
      const winJson = await winRes.json();
      assert.equal(winJson.data.activeBookingsCount, 1);
      assert.equal(winJson.data.status, "OPEN");
    });

    it("should account for active appointments: booking 2nd appointment reaches capacity and transitions window to FULL", async () => {
      // Create another patient
      const p2User = await prisma.user.create({
        data: {
          name: `Patient 2 ${testTimestamp}`,
          email: `patient2.win.${testTimestamp}@example.com`,
          passwordHash: await bcrypt.hash("Password123!", 12),
          role: "PATIENT",
          tokenVersion: 0,
        },
      });

      const p2Record = await prisma.patient.create({
        data: {
          userId: p2User.id,
          name: `Patient 2 ${testTimestamp}`,
          gender: "FEMALE",
          dateOfBirth: new Date("1992-05-10"),
        },
      });

      // Create 2nd appointment (ONLINE -> PENDING)
      const booking2 = await appointmentService.createAppointment({
        organizationId: org1.id,
        patientId: p2Record.id,
        doctorId: doctor1.id,
        appointmentDate: capacityTestDate,
        paymentMethod: "ONLINE",
        source: "PATIENT_APP",
      });

      appointment2Id = booking2.appointment.id;
      assert.equal(booking2.appointment.status, "PENDING");

      // Verify activeBookingsCount = 2 and status transitioned to FULL
      const winRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${capacityWindowId}`,
        {
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );
      const winJson = await winRes.json();
      assert.equal(winJson.data.activeBookingsCount, 2);
      assert.equal(winJson.data.status, "FULL");
    });

    it("should reject reducing capacity below current active bookings count (2) with 409 Conflict", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${capacityWindowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            capacity: 1, // Currently has 2 active bookings!
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 409);
      assert.equal(json.success, false);
      assert.ok(json.message.includes("Cannot reduce capacity"));
    });

    it("should reject setting status to OPEN when active bookings equal capacity with 409 Conflict", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${capacityWindowId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            status: "OPEN",
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 409);
      assert.equal(json.success, false);
      assert.ok(json.message.includes("capacity"));
    });

    it("should auto-transition status from FULL to OPEN when capacity is increased above active bookings", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${capacityWindowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            capacity: 5, // Increased from 2 to 5
          }),
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.capacity, 5);
      assert.equal(json.data.status, "OPEN");
    });
  });

  // =========================================================================
  // 7. SAFE DELETION, CONFLICT POLICY & RECORD PRESERVATION
  // =========================================================================
  describe("Safe Deletion, Conflict Policy & Record Preservation", () => {
    let deletionWindowId;
    let appointmentId;
    let deletionTestDate;

    before(async () => {
      const d = new Date();
      d.setDate(d.getDate() + 50);
      deletionTestDate = d.toISOString().split("T")[0];

      // Create window
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: deletionTestDate,
            startTime: "09:00",
            endTime: "11:00",
            capacity: 3,
            status: "OPEN",
          }),
        },
      );
      const json = await res.json();
      deletionWindowId = json.data.id;

      // Book an appointment on this date
      const booking = await appointmentService.createAppointment({
        organizationId: org1.id,
        patientId: patientRecord.id,
        doctorId: doctor1.id,
        appointmentDate: deletionTestDate,
        paymentMethod: "PAY_AT_HOSPITAL",
        source: "STAFF",
      });
      appointmentId = booking.appointment.id;
    });

    it("should reject deleting window that has active appointments with 409 Conflict", async () => {
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${deletionWindowId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 409);
      assert.equal(json.success, false);
      assert.ok(json.message.includes("Cannot delete appointment window"));

      // Verify the appointment was NOT deleted or cancelled
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      assert.ok(appt);
      assert.equal(appt.status, "CONFIRMED");
    });

    it("should safely delete window once appointments are cancelled, preserving clinical history", async () => {
      // Cancel the appointment
      await appointmentService.cancelAppointment({
        organizationId: org1.id,
        appointmentId,
        cancelledBy: "STAFF",
        reason: "Patient rescheduled",
      });

      // Now deleting the window should succeed
      const res = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${deletionWindowId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
          },
        },
      );

      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.deleted, true);

      // Verify historical appointment record is PRESERVED with all patient data
      const preservedAppt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      assert.ok(preservedAppt);
      assert.equal(preservedAppt.status, "CANCELLED");
      assert.equal(preservedAppt.patientId, patientRecord.id);
      assert.equal(preservedAppt.appointmentWindowId, null); // Safely unlinked
    });

    it("should reject cross-tenant deletion with 403", async () => {
      // Create empty window
      const d = new Date();
      d.setDate(d.getDate() + 55);
      const dateStr = d.toISOString().split("T")[0];

      const winRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: dateStr,
            capacity: 5,
          }),
        },
      );
      const winJson = await winRes.json();
      const emptyWinId = winJson.data.id;

      const delRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${emptyWinId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${org2AdminToken}`,
          },
        },
      );

      assert.equal(delRes.status, 403);
    });
  });

  // =========================================================================
  // 8. CONCURRENCY & RACE CONDITIONS
  // =========================================================================
  describe("Concurrency & Race Conditions", () => {
    it("should handle concurrent capacity update and status query safely without corruption", async () => {
      const d = new Date();
      d.setDate(d.getDate() + 60);
      const concDate = d.toISOString().split("T")[0];

      const winRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({
            date: concDate,
            capacity: 10,
            status: "OPEN",
          }),
        },
      );
      const winJson = await winRes.json();
      const concWinId = winJson.data.id;

      // Fire 5 concurrent updates and queries
      const promises = [
        fetch(`${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1AdminToken}`,
          },
          body: JSON.stringify({ capacity: 12 }),
        }),
        fetch(`${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doctor1Token}`,
          },
          body: JSON.stringify({ capacity: 15 }),
        }),
        fetch(`${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}`, {
          headers: { Authorization: `Bearer ${org1NurseToken}` },
        }),
        fetch(
          `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${org1AdminToken}`,
            },
            body: JSON.stringify({ status: "CLOSED" }),
          },
        ),
        fetch(`${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}`, {
          headers: { Authorization: `Bearer ${doctor1Token}` },
        }),
      ];

      const responses = await Promise.all(promises);
      for (const r of responses) {
        assert.equal(r.status, 200);
      }

      // Verify consistent state at the end
      const finalRes = await fetch(
        `${baseUrlPlural}/${org1.id}/doctors/${doctor1.id}/${concWinId}`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );
      const finalJson = await finalRes.json();
      assert.equal(finalRes.status, 200);
      assert.ok([12, 15].includes(finalJson.data.capacity));
    });
  });

  // =========================================================================
  // 9. SINGULAR ROUTE MOUNT VERIFICATION (/api/appointment-window)
  // =========================================================================
  describe("Singular Route Mount (/api/appointment-window)", () => {
    it("should allow querying windows via /api/appointment-window prefix identically", async () => {
      const res = await fetch(
        `${baseUrlSingular}/${org1.id}/doctors/${doctor1.id}`,
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
    });
  });
});
