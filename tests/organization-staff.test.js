const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");

let server;
let baseUrl;
const testTimestamp = Date.now();

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

let dept1;
let dept2OtherOrg;

let createdStaffId;
let createdDoctorId;

describe("Module 3 — Organization Staff Management Endpoints", () => {
  before(async () => {
    // 1. Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/organization-staff`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash("Password123!", 12);

    // 2. Setup Super Admin
    superAdminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: `superadmin.staff.${testTimestamp}@example.com`,
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

    // 3. Setup Test Organization 1
    org1 = await prisma.organization.create({
      data: {
        name: `Staff Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `stafforg1.${testTimestamp}@example.com`,
        phone: `811${String(testTimestamp).slice(-7)}`,
        status: "ACTIVE",
      },
    });

    // 4. Setup Test Organization 2
    org2 = await prisma.organization.create({
      data: {
        name: `Staff Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "UTC",
        email: `stafforg2.${testTimestamp}@example.com`,
        phone: `822${String(testTimestamp).slice(-7)}`,
        status: "ACTIVE",
      },
    });

    // 5. Setup Departments
    dept1 = await prisma.department.create({
      data: {
        organizationId: org1.id,
        name: `Cardiology ${testTimestamp}`,
        status: "ACTIVE",
      },
    });

    dept2OtherOrg = await prisma.department.create({
      data: {
        organizationId: org2.id,
        name: `Neurology ${testTimestamp}`,
        status: "ACTIVE",
      },
    });

    // 6. Setup Admin for Org 1
    org1AdminUser = await prisma.user.create({
      data: {
        name: "Org1 Admin",
        email: `staffadmin1.${testTimestamp}@example.com`,
        phone: `833${String(testTimestamp).slice(-7)}`,
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

    // 7. Setup Admin for Org 2
    org2AdminUser = await prisma.user.create({
      data: {
        name: "Org2 Admin",
        email: `staffadmin2.${testTimestamp}@example.com`,
        phone: `844${String(testTimestamp).slice(-7)}`,
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

    // 8. Setup Nurse for Org 1
    org1NurseUser = await prisma.user.create({
      data: {
        name: "Org1 Nurse",
        email: `staffnurse1.${testTimestamp}@example.com`,
        phone: `855${String(testTimestamp).slice(-7)}`,
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

    // 9. Setup Patient
    patientUser = await prisma.user.create({
      data: {
        name: "Ordinary Patient",
        email: `patient.staff.${testTimestamp}@example.com`,
        phone: `866${String(testTimestamp).slice(-7)}`,
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
    // Clean up created entities
    const orgIds = [org1?.id, org2?.id].filter(Boolean);
    const userIds = [
      org1AdminUser?.id,
      org2AdminUser?.id,
      org1NurseUser?.id,
      patientUser?.id,
    ].filter(Boolean);

    await prisma.doctorDepartment.deleteMany({
      where: {
        doctor: { organizationId: { in: orgIds } },
      },
    });
    await prisma.doctor.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });

    // Clean up any test users created dynamically
    await prisma.user.deleteMany({
      where: { email: { contains: String(testTimestamp) } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // 1. STAFF CREATION (POST /:organizationId/staff)
  // -------------------------------------------------------------
  describe("Staff Creation (POST /:organizationId/staff)", () => {
    it("should allow Org1 Admin to create a staff member (RECEPTIONIST)", async () => {
      const staffEmail = `receptionist.${testTimestamp}@example.com`;
      const staffPhone = `877${String(testTimestamp).slice(-7)}`;

      const res = await fetch(`${baseUrl}/${org1.id}/staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Receptionist Alice",
          email: staffEmail,
          phone: staffPhone,
          password: "SecurePassword123!",
          role: "RECEPTIONIST",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.user.id);
      assert.equal(body.data.user.email, staffEmail);
      assert.equal(body.data.membership.role, "RECEPTIONIST");
      assert.equal(body.data.membership.status, "ACTIVE");

      // Verify response sanitization: NO sensitive fields exposed
      assert.equal(body.data.user.passwordHash, undefined);
      assert.equal(body.data.user.tokenVersion, undefined);

      createdStaffId = body.data.membership.id;
    });

    it("should reject creation with duplicate email with 409 Conflict", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Email Staff",
          email: `receptionist.${testTimestamp}@example.com`, // duplicate
          password: "SecurePassword123!",
          role: "NURSE",
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/);
    });

    it("should reject cross-tenant staff creation (Org2 Admin creating in Org1) with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cross Tenant Staff",
          email: `crosstenant.${testTimestamp}@example.com`,
          password: "Password123!",
          role: "RECEPTIONIST",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /do not belong/);
    });

    it("should reject non-admin staff (NURSE) from creating staff with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1NurseToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Nurse Attempt Staff",
          email: `nurseattempt.${testTimestamp}@example.com`,
          password: "Password123!",
          role: "RECEPTIONIST",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Insufficient organization permissions/);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unauthenticated Staff" }),
      });

      assert.equal(res.status, 401);
    });
  });

  // -------------------------------------------------------------
  // 2. STAFF LISTING & RETRIEVAL (GET /:organizationId/staff)
  // -------------------------------------------------------------
  describe("Staff Listing & Retrieval (GET /:organizationId/staff)", () => {
    it("should allow Org1 Admin to list staff with pagination", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.ok(body.data.length >= 1);
    });

    it("should filter staff by role", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff?role=RECEPTIONIST`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
      body.data.forEach((member) => {
        assert.equal(member.role, "RECEPTIONIST");
      });
    });

    it("should allow Org1 Admin to retrieve staff by ID", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff/${createdStaffId}`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.id, createdStaffId);
      assert.ok(body.data.user);
    });

    it("should reject cross-tenant staff retrieval (Org2 Admin accessing Org1 staff) with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff/${createdStaffId}`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should return 404 for non-existent staff ID", async () => {
      const res = await fetch(
        `${baseUrl}/${org1.id}/staff/00000000-0000-0000-0000-000000000000`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Staff not found");
    });
  });

  // -------------------------------------------------------------
  // 3. STAFF PROFILE UPDATE & STATUS (PATCH /:orgId/staff/:staffId)
  // -------------------------------------------------------------
  describe("Staff Updates & Status (PATCH /:orgId/staff/:staffId)", () => {
    it("should allow Org1 Admin to update staff name and role", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff/${createdStaffId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Receptionist Alice Promoted",
          role: "MANAGER",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.user.name, "Receptionist Alice Promoted");
      assert.equal(body.data.membership.role, "MANAGER");
    });

    it("should allow Org1 Admin to update staff status to INACTIVE", async () => {
      const res = await fetch(
        `${baseUrl}/${org1.id}/staff/${createdStaffId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "INACTIVE",
          }),
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, "INACTIVE");
    });

    it("should reject setting staff status to already-assigned status with 409", async () => {
      const res = await fetch(
        `${baseUrl}/${org1.id}/staff/${createdStaffId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "INACTIVE",
          }),
        },
      );

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /already inactive/);
    });

    it("should allow setting staff status back to ACTIVE", async () => {
      const res = await fetch(
        `${baseUrl}/${org1.id}/staff/${createdStaffId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "ACTIVE",
          }),
        },
      );

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.status, "ACTIVE");
    });

    it("should reject cross-tenant staff update with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/staff/${createdStaffId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Attacked Name",
        }),
      });

      assert.equal(res.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 4. DOCTOR MANAGEMENT (POST /:orgId/doctors)
  // -------------------------------------------------------------
  describe("Doctor Management (/doctors)", () => {
    it("should allow Org1 Admin to create a doctor with department assignments", async () => {
      const doctorEmail = `doctor1.${testTimestamp}@example.com`;
      const docRegNum = `DOCREG-${testTimestamp}`;

      const res = await fetch(`${baseUrl}/${org1.id}/doctors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Dr. Gregory House",
          email: doctorEmail,
          phone: `888${String(testTimestamp).slice(-7)}`,
          password: "SecureDoctorPassword123!",
          qualification: "MD, Diagnostics",
          registrationNumber: docRegNum,
          consultationFeeMinor: 5000,
          departmentIds: [dept1.id],
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.doctor.id);
      assert.equal(body.data.doctor.registrationNumber, docRegNum);
      assert.equal(body.data.user.role, "DOCTOR");

      createdDoctorId = body.data.doctor.id;
    });

    it("should reject doctor creation with departments belonging to another organization with 400", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Dr. Cross Dept",
          email: `dr.cross.${testTimestamp}@example.com`,
          password: "Password123!",
          departmentIds: [dept2OtherOrg.id], // belongs to org2!
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /do not belong to this organization/);
    });

    it("should reject doctor creation with duplicate registrationNumber in same org with 409", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Dr. Duplicate Reg",
          email: `dr.dup.${testTimestamp}@example.com`,
          password: "Password123!",
          registrationNumber: `DOCREG-${testTimestamp}`, // duplicate
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /registration number already exists/);
    });

    it("should allow Org1 Admin to list doctors with pagination", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
    });

    it("should allow Org1 Admin to retrieve doctor by ID", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors/${createdDoctorId}`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdDoctorId);
      assert.ok(body.data.user);
      assert.ok(Array.isArray(body.data.departments));
    });

    it("should allow Org1 Admin to update doctor details", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors/${createdDoctorId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Dr. Gregory House Updated",
          consultationFeeMinor: 7500,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.name, "Dr. Gregory House Updated");
      assert.equal(body.data.consultationFeeMinor, 7500);
    });

    it("should allow Org1 Admin to update doctor status", async () => {
      const res = await fetch(
        `${baseUrl}/${org1.id}/doctors/${createdDoctorId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "INACTIVE",
          }),
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, "INACTIVE");
    });

    it("should reject cross-tenant doctor access (Org2 Admin accessing Org1 doctor) with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/doctors/${createdDoctorId}`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
    });
  });
});
