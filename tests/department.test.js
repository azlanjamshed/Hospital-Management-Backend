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
const randPhone = (p = "9") => `${p}${Math.floor(100000000 + Math.random() * 900000000)}`.slice(0, 10);

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

let createdDeptId;
let createdDoctorId;

describe("Module 4 — Department Management Endpoints", () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrlClean = `http://127.0.0.1:${port}/api/departments`;
        baseUrlLegacy = `http://127.0.0.1:${port}/api/departments`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash("Password123!", 12);

    // 1. Super Admin
    superAdminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: `superadmin.dept.${testTimestamp}@example.com`,
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
        name: `Dept Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `deptorg1.${testTimestamp}@example.com`,
        phone: randPhone("91"),
        status: "ACTIVE",
      },
    });

    org2 = await prisma.organization.create({
      data: {
        name: `Dept Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "UTC",
        email: `deptorg2.${testTimestamp}@example.com`,
        phone: randPhone("92"),
        status: "ACTIVE",
      },
    });

    // 3. Org1 Admin
    org1AdminUser = await prisma.user.create({
      data: {
        name: "Org1 Dept Admin",
        email: `deptadmin1.${testTimestamp}@example.com`,
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
        name: "Org2 Dept Admin",
        email: `deptadmin2.${testTimestamp}@example.com`,
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

    // 5. Org1 Nurse
    org1NurseUser = await prisma.user.create({
      data: {
        name: "Org1 Nurse",
        email: `deptnurse1.${testTimestamp}@example.com`,
        phone: randPhone("95"),
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

    // 6. Patient
    patientUser = await prisma.user.create({
      data: {
        name: "Ordinary Patient",
        email: `deptpatient.${testTimestamp}@example.com`,
        phone: randPhone("96"),
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
    const userIds = [
      org1AdminUser?.id,
      org2AdminUser?.id,
      org1NurseUser?.id,
      patientUser?.id,
    ].filter(Boolean);

    await prisma.doctorDepartment.deleteMany({
      where: {
        department: { organizationId: { in: orgIds } },
      },
    });
    await prisma.doctor.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });

    await prisma.user.deleteMany({
      where: { email: { contains: String(testTimestamp) } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // 1. DEPARTMENT CREATION
  // -------------------------------------------------------------
  describe("Department Creation (POST)", () => {
    it("should allow Org1 Admin to create a department using clean URL (/api/departments/:orgId)", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cardiology",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.name, "Cardiology");
      assert.equal(body.data.status, "ACTIVE");
      assert.equal(body.data.organizationId, org1.id);

      createdDeptId = body.data.id;
    });

    it("should allow Org1 Admin to create a department using legacy URL (/api/departments/:orgId/departments)", async () => {
      const res = await fetch(`${baseUrlLegacy}/${org1.id}/departments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Neurology",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.name, "Neurology");
    });

    it("should allow SUPER_ADMIN to create a department in any organization", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Pediatrics",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.name, "Pediatrics");
    });

    it("should reject duplicate department name in the same organization with 409 Conflict", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cardiology", // Duplicate
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /already exists in this organization/);
    });

    it("should allow the same department name in a different organization", async () => {
      const res = await fetch(`${baseUrlClean}/${org2.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cardiology", // Allowed in org2
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.organizationId, org2.id);
    });

    it("should reject cross-tenant department creation (Org2 Admin creating in Org1) with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Orthopedics",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /do not belong/);
    });

    it("should reject non-admin staff (NURSE) with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1NurseToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Oncology",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Insufficient organization permissions/);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unauthenticated Dept" }),
      });

      assert.equal(res.status, 401);
    });

    it("should reject invalid body with 400 (name too short)", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "A",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject unknown body fields with 400 (strict validation)", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Dermatology",
          unknownProperty: "malicious",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject invalid organization UUID parameter with 400", async () => {
      const res = await fetch(`${baseUrlClean}/not-a-valid-uuid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Valid Name",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, "Validation failed");
      assert.ok(
        body.errors.some((e) => /Invalid organization ID format/.test(e.message)),
      );
    });
  });

  // -------------------------------------------------------------
  // 2. DEPARTMENT LISTING & RETRIEVAL
  // -------------------------------------------------------------
  describe("Department Listing & Retrieval (GET)", () => {
    it("should allow Org1 Admin to list departments with pagination", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.equal(body.pagination.page, 1);
      assert.ok(body.data.length >= 2);
    });

    it("should filter departments by search query", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}?search=Cardio`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.length >= 1);
      body.data.forEach((d) => {
        assert.match(d.name, /Cardio/i);
      });
    });

    it("should filter departments by status", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}?status=ACTIVE`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      body.data.forEach((d) => {
        assert.equal(d.status, "ACTIVE");
      });
    });

    it("should support listing via legacy URL (/api/departments/:orgId/departments)", async () => {
      const res = await fetch(`${baseUrlLegacy}/${org1.id}/departments`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 2);
    });

    it("should allow Org1 Admin to retrieve department by ID", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdDeptId);
      assert.equal(body.data.name, "Cardiology");
      assert.ok(body.data._count);
    });

    it("should allow retrieving department by ID via legacy URL", async () => {
      const res = await fetch(
        `${baseUrlLegacy}/${org1.id}/departments/${createdDeptId}`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdDeptId);
    });

    it("should reject cross-tenant retrieval (Org2 Admin accessing Org1 department) with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should return 404 for non-existent department ID", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/00000000-0000-0000-0000-000000000000`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Department not found");
    });
  });

  // -------------------------------------------------------------
  // 3. DEPARTMENT PROFILE UPDATES
  // -------------------------------------------------------------
  describe("Department Updates (PATCH)", () => {
    it("should allow Org1 Admin to update department name", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Advanced Cardiology",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.name, "Advanced Cardiology");
    });

    it("should reject update to an already existing name in same organization with 409", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Neurology", // Already exists in Org1
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /already exists in this organization/);
    });

    it("should reject empty update body with 400", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
    });

    it("should reject cross-tenant department update with 403", async () => {
      const res = await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Hacked Cardiology",
        }),
      });

      assert.equal(res.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 4. DEPARTMENT STATUS MANAGEMENT
  // -------------------------------------------------------------
  describe("Department Status Management (PATCH /status)", () => {
    it("should allow Org1 Admin to set department status to INACTIVE", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/status`,
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

    it("should reject setting status to already-assigned status with 409", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/status`,
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

    it("should allow setting department status back to ACTIVE", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/status`,
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

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, "ACTIVE");
    });

    it("should reject cross-tenant status update with 403", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org2AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "INACTIVE",
          }),
        },
      );

      assert.equal(res.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 5. DOCTOR ASSIGNMENT DEPENDENCIES & SUB-RESOURCE
  // -------------------------------------------------------------
  describe("Doctor Department Dependencies (/doctors)", () => {
    it("should assign a doctor to the department and list via department endpoint", async () => {
      const doctorUser = await prisma.user.create({
        data: {
          name: "Dr. Heart Specialist",
          email: `dr.heart.${testTimestamp}@example.com`,
          phone: randPhone("97"),
          passwordHash: await bcrypt.hash("DoctorPassword123!", 12),
          role: "DOCTOR",
          tokenVersion: 0,
        },
      });

      const doctor = await prisma.doctor.create({
        data: {
          organizationId: org1.id,
          userId: doctorUser.id,
          name: "Dr. Heart Specialist",
          qualification: "MD, Cardiology",
          registrationNumber: `REG-HEART-${testTimestamp}`,
        },
      });
      createdDoctorId = doctor.id;

      await prisma.doctorDepartment.create({
        data: {
          doctorId: doctor.id,
          departmentId: createdDeptId,
        },
      });

      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/doctors`,
        {
          headers: { Authorization: `Bearer ${org1AdminToken}` },
        },
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].id, doctor.id);
      assert.equal(body.data[0].name, "Dr. Heart Specialist");
      assert.ok(body.pagination);
    });

    it("should preserve doctor department associations after department deactivation", async () => {
      // Deactivate department
      const deactivateRes = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${org1AdminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "INACTIVE" }),
        },
      );
      assert.equal(deactivateRes.status, 200);

      // Verify doctor relationship is still intact (no cascade deletion)
      const docDept = await prisma.doctorDepartment.findUnique({
        where: {
          doctorId_departmentId: {
            doctorId: createdDoctorId,
            departmentId: createdDeptId,
          },
        },
      });
      assert.ok(docDept);
      assert.equal(docDept.departmentId, createdDeptId);
      assert.equal(docDept.doctorId, createdDoctorId);

      // Re-activate department
      await fetch(`${baseUrlClean}/${org1.id}/${createdDeptId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
    });

    it("should reject cross-tenant access to department doctors with 403", async () => {
      const res = await fetch(
        `${baseUrlClean}/${org1.id}/${createdDeptId}/doctors`,
        {
          headers: { Authorization: `Bearer ${org2AdminToken}` },
        },
      );

      assert.equal(res.status, 403);
    });
  });
});
