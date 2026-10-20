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

let doctorUser;
let doctorToken;

let patientUser;
let patientToken;

describe("Module 2 — Organization Management Endpoints", () => {
  before(async () => {
    // 1. Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/organization`;
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
          email: `superadmin.${testTimestamp}@example.com`,
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
        name: `Org One ${testTimestamp}`,
        type: "HOSPITAL",
        timezone: "Asia/Kolkata",
        email: `org1.${testTimestamp}@example.com`,
        phone: `911${String(testTimestamp).slice(-7)}`,
        address: "123 Main Street, City",
        status: "ACTIVE",
      },
    });

    // 4. Setup Test Organization 2
    org2 = await prisma.organization.create({
      data: {
        name: `Org Two ${testTimestamp}`,
        type: "CLINIC",
        timezone: "UTC",
        email: `org2.${testTimestamp}@example.com`,
        phone: `922${String(testTimestamp).slice(-7)}`,
        address: "456 Side Street, Town",
        status: "ACTIVE",
      },
    });

    // 5. Setup Admin for Org 1
    org1AdminUser = await prisma.user.create({
      data: {
        name: "Org1 Admin",
        email: `org1admin.${testTimestamp}@example.com`,
        phone: `933${String(testTimestamp).slice(-7)}`,
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

    // 6. Setup Admin for Org 2
    org2AdminUser = await prisma.user.create({
      data: {
        name: "Org2 Admin",
        email: `org2admin.${testTimestamp}@example.com`,
        phone: `944${String(testTimestamp).slice(-7)}`,
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

    // 7. Setup Doctor for Org 1
    doctorUser = await prisma.user.create({
      data: {
        name: "Dr. Org1",
        email: `dr1.${testTimestamp}@example.com`,
        phone: `955${String(testTimestamp).slice(-7)}`,
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
        doctor: {
          create: {
            organizationId: org1.id,
            name: "Dr. Org1",
            status: "ACTIVE",
          },
        },
      },
      include: {
        doctor: true,
      },
    });

    doctorToken = jwt.sign(
      {
        userId: doctorUser.id,
        role: "DOCTOR",
        doctorId: doctorUser.doctor.id,
        tokenVersion: doctorUser.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 8. Setup Patient user
    patientUser = await prisma.user.create({
      data: {
        name: "Ordinary Patient",
        email: `patient.${testTimestamp}@example.com`,
        phone: `966${String(testTimestamp).slice(-7)}`,
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
      doctorUser?.id,
      patientUser?.id,
    ].filter(Boolean);

    await prisma.doctor.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });

    // Clean up any extra organizations created in tests
    await prisma.organization.deleteMany({
      where: { name: { contains: String(testTimestamp) } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // 1. ORGANIZATION CREATION (POST /api/organization)
  // -------------------------------------------------------------
  describe("Organization Creation (POST /)", () => {
    it("should allow SUPER_ADMIN to create an organization", async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `New Hospital ${testTimestamp}`,
          type: "HOSPITAL",
          timezone: "Asia/Kolkata",
          address: "789 Health Ave",
          phone: `977${String(testTimestamp).slice(-7)}`,
          email: `newhospital.${testTimestamp}@example.com`,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.id);
      assert.equal(body.data.name, `New Hospital ${testTimestamp}`);
      assert.equal(body.data.status, "ACTIVE");
    });

    it("should reject creation by non-SUPER_ADMIN with 403", async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Unauthorized Clinic",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, "Access denied");
    });

    it("should reject creation without authentication with 401", async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unauthenticated Clinic" }),
      });

      assert.equal(res.status, 401);
    });

    it("should reject duplicate email or phone with 409", async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Clinic",
          email: org1.email, // duplicate
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/);
    });

    it("should reject invalid body (name too short) with 400", async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "A",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, "Validation failed");
    });
  });

  // -------------------------------------------------------------
  // 2. INITIAL ADMIN CREATION (POST /api/organization/admin)
  // -------------------------------------------------------------
  describe("Organization Admin Creation (POST /admin)", () => {
    it("should allow SUPER_ADMIN to create an admin user for an organization", async () => {
      const adminEmail = `seededadmin.${Date.now()}@example.com`;
      const res = await fetch(`${baseUrl}/admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: org1.id,
          name: "Seeded Admin",
          email: adminEmail,
          password: "SecurePassword123!",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.user.email, adminEmail);
      assert.equal(body.data.membership.role, "ADMIN");
      assert.equal(body.data.membership.organizationId, org1.id);

      // Clean up seeded user
      await prisma.organizationMember.deleteMany({ where: { userId: body.data.user.id } });
      await prisma.user.deleteMany({ where: { id: body.data.user.id } });
    });

    it("should reject admin creation for non-existent organization with 404", async () => {
      const res = await fetch(`${baseUrl}/admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: "00000000-0000-0000-0000-000000000000",
          name: "Ghost Admin",
          email: `ghost.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Organization not found");
    });
  });

  // -------------------------------------------------------------
  // 3. LIST ORGANIZATIONS (GET /api/organization)
  // -------------------------------------------------------------
  describe("List Organizations (GET /)", () => {
    it("should allow SUPER_ADMIN to list organizations with pagination", async () => {
      const res = await fetch(`${baseUrl}/?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 5);
      assert.ok(typeof body.pagination.total === "number");
    });

    it("should filter organizations by search query", async () => {
      const res = await fetch(`${baseUrl}/?search=${encodeURIComponent(org1.name)}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].id, org1.id);
    });

    it("should filter organizations by type and status", async () => {
      const res = await fetch(`${baseUrl}/?type=HOSPITAL&status=ACTIVE`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body.data));
      body.data.forEach((org) => {
        assert.equal(org.type, "HOSPITAL");
        assert.equal(org.status, "ACTIVE");
      });
    });

    it("should reject listing by non-SUPER_ADMIN with 403", async () => {
      const res = await fetch(`${baseUrl}/`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 401);
    });
  });

  // -------------------------------------------------------------
  // 4. GET ORGANIZATION BY ID (GET /api/organization/:organizationId)
  // -------------------------------------------------------------
  describe("Get Organization by ID (GET /:organizationId)", () => {
    it("should allow SUPER_ADMIN to retrieve any organization", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.id, org1.id);
      assert.equal(body.data.name, org1.name);
      assert.ok(body.data._count);
    });

    it("should allow Org1 Admin to retrieve Org1", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, org1.id);
    });

    it("should allow active Doctor of Org1 to retrieve Org1", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, org1.id);
    });

    it("should reject cross-tenant access (Org2 Admin trying to access Org1) with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /do not belong/);
    });

    it("should reject patient access with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should return 400 for invalid UUID parameter", async () => {
      const res = await fetch(`${baseUrl}/not-a-valid-uuid`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.message, "Validation failed");
    });

    it("should return 404 for non-existent organization requested by SUPER_ADMIN", async () => {
      const res = await fetch(`${baseUrl}/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.message, "Organization not found");
    });
  });

  // -------------------------------------------------------------
  // 5. UPDATE ORGANIZATION PROFILE (PATCH /api/organization/:organizationId)
  // -------------------------------------------------------------
  describe("Update Organization Profile (PATCH /:organizationId)", () => {
    it("should allow Org1 Admin to update permitted fields", async () => {
      const updatedName = `Updated Org One ${testTimestamp}`;
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedName,
          address: "999 Renovated Blvd",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.name, updatedName);
      assert.equal(body.data.address, "999 Renovated Blvd");
    });

    it("should reject ordinary Admin updating privileged status with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "SUSPENDED",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /super administrators/);
    });

    it("should allow SUPER_ADMIN to update status to SUSPENDED", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "SUSPENDED",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, "SUSPENDED");

      // Revert status back to ACTIVE for subsequent tests
      await prisma.organization.update({
        where: { id: org1.id },
        data: { status: "ACTIVE" },
      });
    });

    it("should reject unknown or disallowed fields with 400", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maliciousField: "injection",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.message, "Validation failed");
    });

    it("should reject cross-tenant update (Org2 Admin trying to update Org1) with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Attacked Org",
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /do not belong/);
    });

    it("should reject update resulting in duplicate email with 409", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: org2.email, // already used by org2
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /already exists/);
    });
  });

  // -------------------------------------------------------------
  // 6. READ & UPDATE SETTINGS (GET & PATCH /:organizationId/settings)
  // -------------------------------------------------------------
  describe("Organization Settings (GET & PATCH /:organizationId/settings)", () => {
    it("should allow Org1 Admin to read settings", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`, {
        headers: { Authorization: `Bearer ${org1AdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.organizationId, org1.id);
      assert.ok(body.data.timezone);
    });

    it("should allow Org1 Admin to update settings (timezone)", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone: "America/New_York",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.timezone, "America/New_York");

      // Verify in DB
      const inDb = await prisma.organization.findUnique({ where: { id: org1.id } });
      assert.equal(inDb.timezone, "America/New_York");
    });

    it("should reject invalid/empty timezone in settings update with 400", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org1AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone: "",
        }),
      });

      assert.equal(res.status, 400);
    });

    it("should reject cross-tenant settings access with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`, {
        headers: { Authorization: `Bearer ${org2AdminToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should reject cross-tenant settings update with 403", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${org2AdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone: "Asia/Tokyo",
        }),
      });

      assert.equal(res.status, 403);
    });

    it("should reject unauthenticated settings request with 401", async () => {
      const res = await fetch(`${baseUrl}/${org1.id}/settings`);
      assert.equal(res.status, 401);
    });
  });
});
