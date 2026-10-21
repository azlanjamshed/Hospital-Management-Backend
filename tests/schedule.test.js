const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");

let server;
let baseUrlClean;
let baseUrlLegacy;
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

let doctor1User;
let doctor1;
let doctor1Token;

let doctor2User;
let doctor2;
let doctor2Token;

let doctor3User;
let doctor3;
let doctor3Token;

let createdSchedule1Id;
let createdSchedule2Id;

describe("Module 5 — Doctor Schedule Management Endpoints", () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrlClean = `http://127.0.0.1:${port}/api/schedules`;
        baseUrlLegacy = `http://127.0.0.1:${port}/api/schedules`;
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
          email: `superadmin.sched.${testTimestamp}@example.com`,
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
        name: `Sched Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `schedorg1.${testTimestamp}@example.com`,
        phone: randPhone("91"),
        status: "ACTIVE",
      },
    });

    org2 = await prisma.organization.create({
      data: {
        name: `Sched Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "UTC",
        email: `schedorg2.${testTimestamp}@example.com`,
        phone: randPhone("92"),
        status: "ACTIVE",
      },
    });

    // 3. Org1 Admin
    org1AdminUser = await prisma.user.create({
      data: {
        name: "Org1 Sched Admin",
        email: `schedadmin1.${testTimestamp}@example.com`,
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

    // 4. Org2 Admin
    org2AdminUser = await prisma.user.create({
      data: {
        name: "Org2 Sched Admin",
        email: `schedadmin2.${testTimestamp}@example.com`,
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

    // 5. Doctor 1 (Org 1)
    doctor1User = await prisma.user.create({
      data: {
        name: "Dr. Alpha Sched",
        email: `dralpha.${testTimestamp}@example.com`,
        phone: randPhone("95"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor1 = await prisma.doctor.create({
      data: {
        organizationId: org1.id,
        userId: doctor1User.id,
        name: "Dr. Alpha Sched",
        status: "ACTIVE",
        registrationNumber: `REG-A-${testTimestamp}`,
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

    // 6. Doctor 2 (Org 1)
    doctor2User = await prisma.user.create({
      data: {
        name: "Dr. Beta Sched",
        email: `drbeta.${testTimestamp}@example.com`,
        phone: randPhone("96"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor2 = await prisma.doctor.create({
      data: {
        organizationId: org1.id,
        userId: doctor2User.id,
        name: "Dr. Beta Sched",
        status: "ACTIVE",
        registrationNumber: `REG-B-${testTimestamp}`,
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

    // 7. Doctor 3 (Org 2)
    doctor3User = await prisma.user.create({
      data: {
        name: "Dr. Gamma Sched",
        email: `drgamma.${testTimestamp}@example.com`,
        phone: randPhone("97"),
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    doctor3 = await prisma.doctor.create({
      data: {
        organizationId: org2.id,
        userId: doctor3User.id,
        name: "Dr. Gamma Sched",
        status: "ACTIVE",
        registrationNumber: `REG-G-${testTimestamp}`,
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

    // 8. Org1 Nurse
    org1NurseUser = await prisma.user.create({
      data: {
        name: "Org1 Nurse",
        email: `schednurse1.${testTimestamp}@example.com`,
        phone: randPhone("98"),
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

    // 9. Patient
    patientUser = await prisma.user.create({
      data: {
        name: "Ordinary Patient",
        email: `schedpatient.${testTimestamp}@example.com`,
        phone: randPhone("99"),
        passwordHash,
        role: "PATIENT",
        tokenVersion: 0,
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
  });

  after(async () => {
    const orgIds = [org1?.id, org2?.id].filter(Boolean);
    const doctorIds = [doctor1?.id, doctor2?.id, doctor3?.id].filter(Boolean);
    const userIds = [
      org1AdminUser?.id,
      org2AdminUser?.id,
      org1NurseUser?.id,
      doctor1User?.id,
      doctor2User?.id,
      doctor3User?.id,
      patientUser?.id,
    ].filter(Boolean);

    await prisma.appointment.deleteMany({
      where: { doctorId: { in: doctorIds } },
    });
    await prisma.appointmentWindow.deleteMany({
      where: { doctorId: { in: doctorIds } },
    });
    await prisma.schedule.deleteMany({
      where: { doctorId: { in: doctorIds } },
    });
    await prisma.doctor.deleteMany({
      where: { id: { in: doctorIds } },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });

    await prisma.user.deleteMany({
      where: { email: { contains: String(testTimestamp) } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // 1. RECURRING SCHEDULE CREATION
  // -------------------------------------------------------------
  describe("Schedule Creation (POST)", () => {
    it("should allow Org1 Admin to create a recurring schedule using clean URL", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1, // Monday
          startTime: "09:00",
          endTime: "13:00",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.doctorId, doctor1.id);
      assert.equal(body.data.weekday, 1);
      assert.equal(body.data.startTime, "09:00");
      assert.equal(body.data.endTime, "13:00");

      createdSchedule1Id = body.data.id;
    });

    it("should allow Doctor 1 to create his own schedule using clean URL", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${doctor1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 2, // Tuesday
          startTime: "10:00",
          endTime: "14:00",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.weekday, 2);
      assert.equal(body.data.startTime, "10:00");
      assert.equal(body.data.endTime, "14:00");

      createdSchedule2Id = body.data.id;
    });

    it("should allow creating a schedule using legacy URL (/.../doctors/:docId/schedules)", async () => {
      const res = await fetch(
        `${baseUrlLegacy}/${org1.id}/doctors/${doctor1.id}/schedules`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekday: 3, // Wednesday
            startTime: "08:30",
            endTime: "12:30",
          }),
        },
      );

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.weekday, 3);
    });

    it("should allow non-overlapping back-to-back schedule on the same weekday", async () => {
      // Doctor 1 has Monday 09:00 - 13:00; add Monday 13:00 - 17:00
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${doctor1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1, // Monday
          startTime: "13:00",
          endTime: "17:00",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.weekday, 1);
      assert.equal(body.data.startTime, "13:00");
      assert.equal(body.data.endTime, "17:00");
    });

    it("should reject exact duplicate schedule on the same weekday with 409 Conflict", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          startTime: "09:00",
          endTime: "13:00",
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /overlapping schedule/);
    });

    it("should reject partial overlapping schedule (starts inside existing) with 409", async () => {
      // Existing: 09:00 - 13:00; try 12:00 - 15:00
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          startTime: "12:00",
          endTime: "15:00",
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /overlapping schedule/);
    });

    it("should reject enclosing schedule (starts before and ends after) with 409", async () => {
      // Existing: 09:00 - 13:00; try 08:00 - 14:00
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 1,
          startTime: "08:00",
          endTime: "14:00",
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /overlapping schedule/);
    });

    it("should reject schedule with startTime >= endTime with 400", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "15:00",
          endTime: "11:00",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject schedule with invalid weekday (> 6) with 400", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 7,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject schedule with malformed time format with 400", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "9:00", // missing leading zero
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject unknown body fields with 400 (strict validation)", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
          unknownProperty: "injected",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject Doctor 1 attempting to create schedule for Doctor 2 with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor2.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${doctor1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /only manage your own resources/);
    });

    it("should reject cross-tenant creation (Org2 Admin creating for Org1 Doctor) with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 403);
    });

    it("should reject non-admin staff (NURSE) from creating schedules with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1NurseToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 403);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 401);
    });

    it("should reject invalid UUID parameter with 400", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/not-a-uuid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekday: 4,
          startTime: "09:00",
          endTime: "12:00",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.message, "Validation failed");
    });
  });

  // -------------------------------------------------------------
  // 2. SCHEDULE LISTING & RETRIEVAL
  // -------------------------------------------------------------
  describe("Schedule Listing & Retrieval (GET)", () => {
    it("should allow Org1 Admin to list all schedules for Doctor 1", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 3);
    });

    it("should allow Doctor 1 to list his own schedules", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        headers: { Authorization: `Bearer ${doctor1Token}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
    });

    it("should filter schedules by weekday query (?weekday=1)", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}?weekday=1`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
      body.data.forEach((sched) => {
        assert.equal(sched.weekday, 1);
      });
    });

    it("should support listing via legacy URL (/.../doctors/:docId/schedules)", async () => {
      const res = await fetch(
        `${baseUrlLegacy}/${org1.id}/doctors/${doctor1.id}/schedules`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
    });

    it("should allow Org1 Nurse to view doctor schedules", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        headers: { Authorization: `Bearer ${org1NurseToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
    });

    it("should allow retrieving a single schedule by ID", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule1Id}`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdSchedule1Id);
      assert.equal(body.data.weekday, 1);
      assert.ok(body.data.doctor);
    });

    it("should reject cross-tenant schedule listing with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/doctors/${doctor1.id}`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should return 404 for non-existent schedule ID", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/00000000-0000-0000-0000-000000000000`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Schedule not found");
    });
  });

  // -------------------------------------------------------------
  // 3. SCHEDULE UPDATES
  // -------------------------------------------------------------
  describe("Schedule Updates (PATCH)", () => {
    it("should allow Doctor 1 to update his own schedule", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule2Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: "10:30",
            endTime: "14:30",
          }),
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.startTime, "10:30");
      assert.equal(body.data.endTime, "14:30");
    });

    it("should reject update causing overlap with another schedule with 409", async () => {
      // Doctor 1 has Monday 09:00-13:00 (sched1) and 13:00-17:00
      // Try updating Tuesday schedule (sched2) to Monday 09:30-11:30
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule2Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekday: 1, // Move to Monday
            startTime: "09:30",
            endTime: "11:30",
          }),
        },
      );

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /overlapping schedule/);
    });

    it("should allow updating schedule without self-overlap conflict", async () => {
      // Update sched1 from 09:00-13:00 to 09:15-12:45
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule1Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: "09:15",
            endTime: "12:45",
          }),
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.startTime, "09:15");
      assert.equal(body.data.endTime, "12:45");
    });

    it("should reject update resulting in startTime >= endTime with 400", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule1Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: "16:00",
            endTime: "10:00",
          }),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject empty update body with 400", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule1Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      assert.equal(res.status, 400);
    });

    it("should reject Doctor 1 updating Doctor 2's schedule with 403", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor2.id}/${createdSchedule1Id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${doctor1Token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: "08:00",
          }),
        },
      );

      assert.equal(res.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 4. SCHEDULE DELETION & APPOINTMENT INTEGRITY
  // -------------------------------------------------------------
  describe("Schedule Deletion & Appointment Integrity (DELETE)", () => {
    it("should delete a recurring schedule without altering existing appointment windows or bookings", async () => {
      // 1. Create an appointment window for Doctor 1
      const windowDate = new Date();
      windowDate.setDate(windowDate.getDate() + 7);

      const apptWindow = await prisma.appointmentWindow.create({
        data: {
          organizationId: org1.id,
          doctorId: doctor1.id,
          date: windowDate,
          startTime: "09:00",
          endTime: "13:00",
          capacity: 10,
          status: "OPEN",
        },
      });

      // 2. Delete Doctor 1's schedule (createdSchedule1Id)
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/${createdSchedule1Id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.id, createdSchedule1Id);

      // 3. Verify schedule is removed
      const checkSchedule = await prisma.schedule.findUnique({
        where: { id: createdSchedule1Id },
      });
      assert.equal(checkSchedule, null);

      // 4. Verify existing AppointmentWindow is completely preserved
      const checkWindow = await prisma.appointmentWindow.findUnique({
        where: { id: apptWindow.id },
      });
      assert.ok(checkWindow);
      assert.equal(checkWindow.status, "OPEN");
      assert.equal(checkWindow.capacity, 10);
    });

    it("should allow Doctor 1 to delete his own schedule using legacy URL", async () => {
      const res = await fetch(
        `${baseUrlLegacy}/${org1.id}/doctors/${doctor1.id}/schedules/${createdSchedule2Id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${doctor1Token}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdSchedule2Id);
    });

    it("should reject cross-tenant deletion with 403", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/00000000-0000-0000-0000-000000000000`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${org2AdminToken}` },
        },
      );

      assert.equal(res.status, 403);
    });

    it("should return 404 when deleting a non-existent schedule", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/doctors/${doctor1.id}/00000000-0000-0000-0000-000000000000`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Schedule not found");
    });
  });
});
