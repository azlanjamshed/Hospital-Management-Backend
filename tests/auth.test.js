const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const { hashToken, generateResetToken } = require("../src/utils/crypto.util");

let server;
let baseUrl;
let apiBaseUrl;

const testTimestamp = Date.now();
const testEmail = `test.auth.${testTimestamp}@example.com`;
const testPhone = `987${String(testTimestamp).slice(-7)}`;
const testPassword = "Password123!";
const newPassword = "NewPassword456!";

let createdUserId;
let patientToken;
let superAdminToken;

describe("Module 1 — Authentication Endpoints", () => {
  before(async () => {
    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/auth`;
        apiBaseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // Clean up any test artifacts with matching test credentials
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: testEmail }, { phone: testPhone }],
      },
    });
  });

  after(async () => {
    // Clean up created test data
    if (createdUserId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.patient.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: `test.auth.${testTimestamp}` } },
          { phone: { startsWith: `987${String(testTimestamp).slice(-7)}` } },
        ],
      },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // 1. REGISTRATION
  // -------------------------------------------------------------
  describe("Registration (POST /register)", () => {
    it("should register a patient with email and phone successfully", async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Patient",
          email: testEmail,
          phone: testPhone,
          password: testPassword,
          gender: "MALE",
          dateOfBirth: "1995-05-15",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.id);
      assert.equal(body.data.email, testEmail);
      assert.equal(body.data.phone, testPhone);
      assert.equal(body.data.role, "PATIENT");
      assert.ok(body.data.patientId);

      // Verify dateOfBirth and gender are present (fixing previous bug)
      assert.ok(body.data.dateOfBirth);
      assert.equal(body.data.gender, "MALE");

      // Verify response sanitization: NO sensitive fields exposed
      assert.equal(body.data.passwordHash, undefined);
      assert.equal(body.data.tokenVersion, undefined);

      createdUserId = body.data.id;
    });

    it("should register a patient with phone only", async () => {
      const phoneOnly = `986${String(Date.now()).slice(-7)}`;
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Phone Only Patient",
          phone: phoneOnly,
          password: testPassword,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.email, null);
      assert.equal(body.data.phone, phoneOnly);

      // Clean up phone-only user
      await prisma.patient.deleteMany({ where: { userId: body.data.id } });
      await prisma.user.deleteMany({ where: { id: body.data.id } });
    });

    it("should reject registration without either email or phone", async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Patient",
          password: testPassword,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.errors || body.message);
    });

    it("should reject duplicate email or phone with 409 Conflict", async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate Patient",
          email: testEmail,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  // -------------------------------------------------------------
  // 2. LOGIN
  // -------------------------------------------------------------
  describe("Login (POST /login)", () => {
    it("should login with email and password", async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.token);
      assert.equal(body.data.user.email, testEmail);

      // Verify token payload includes tokenVersion
      const decoded = jwt.decode(body.data.token);
      assert.equal(typeof decoded.tokenVersion, "number");
      assert.equal(decoded.tokenVersion, 0);

      // Response sanitization
      assert.equal(body.data.user.passwordHash, undefined);
      assert.equal(body.data.user.tokenVersion, undefined);

      patientToken = body.data.token;
    });

    it("should login with phone number and password", async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          password: testPassword,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.token);
      assert.equal(body.data.user.phone, testPhone);
    });

    it("should login with identifier field (email or phone)", async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testEmail,
          password: testPassword,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
    });

    it("should reject invalid password with 401", async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword999!",
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, "Invalid credentials");
    });
  });

  // -------------------------------------------------------------
  // 3. PROFILE (GET /me & PATCH /me)
  // -------------------------------------------------------------
  describe("Profile Management (GET /me & PATCH /me)", () => {
    it("should fetch authenticated user profile", async () => {
      const res = await fetch(`${baseUrl}/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.email, testEmail);
      assert.equal(body.data.role, "PATIENT");
      assert.ok(body.data.patient);
      assert.equal(body.data.passwordHash, undefined);
      assert.equal(body.data.tokenVersion, undefined);
    });

    it("should update permitted profile fields", async () => {
      const res = await fetch(`${baseUrl}/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${patientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Patient Name",
          gender: "FEMALE",
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.name, "Updated Patient Name");
      assert.equal(body.data.patient.name, "Updated Patient Name");
      assert.equal(body.data.patient.gender, "FEMALE");
    });

    it("should reject disallowed/unknown profile fields with strict validation", async () => {
      const res = await fetch(`${baseUrl}/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${patientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "SUPER_ADMIN", // Disallowed field
          hack: true,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  // -------------------------------------------------------------
  // 4. PASSWORD CHANGE & TOKEN REVOCATION
  // -------------------------------------------------------------
  describe("Password Change & Token Revocation", () => {
    it("should reject password change with incorrect current password", async () => {
      const res = await fetch(`${baseUrl}/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${patientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "IncorrectPassword123!",
          newPassword: newPassword,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, "Current password is incorrect");
    });

    it("should successfully change password and revoke prior tokens", async () => {
      const res = await fetch(`${baseUrl}/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${patientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: testPassword,
          newPassword: newPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);

      // Verify that the OLD token is now rejected because tokenVersion changed
      const oldTokenRes = await fetch(`${baseUrl}/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      assert.equal(oldTokenRes.status, 401);
      const oldTokenBody = await oldTokenRes.json();
      assert.equal(oldTokenBody.success, false);

      // Verify new password works for login
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: newPassword,
        }),
      });

      assert.equal(loginRes.status, 200);
      const loginBody = await loginRes.json();
      patientToken = loginBody.data.token;
    });

    it("should reject legacy tokens lacking tokenVersion", async () => {
      const legacyToken = jwt.sign(
        { userId: createdUserId, role: "PATIENT" }, // no tokenVersion field
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${baseUrl}/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${legacyToken}` },
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  // -------------------------------------------------------------
  // 5. PASSWORD RECOVERY (FORGOT & RESET)
  // -------------------------------------------------------------
  describe("Password Recovery Workflow", () => {
    it("should fail safely with 503 if SMTP is not configured", async () => {
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const res = await fetch(`${baseUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.success, false);

      process.env.SMTP_HOST = originalHost || "smtp.example.com";
    });

    it("should return generic message without exposing account existence", async () => {
      // Mock SMTP config
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "secret";

      const res = await fetch(`${baseUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent.user.999@example.com" }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.match(body.message, /If an account exists/);
    });

    it("should securely reset password with valid token and revoke old sessions", async () => {
      // Create a valid reset token directly for testing
      const rawToken = generateResetToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt,
          used: false,
        },
      });

      const updatedPassword = "BrandNewPassword789!";
      const res = await fetch(`${baseUrl}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          newPassword: updatedPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);

      // Verify the token is now marked as used
      const dbToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      assert.equal(dbToken.used, true);

      // Verify old patient token is revoked
      const meRes = await fetch(`${baseUrl}/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      assert.equal(meRes.status, 401);

      // Verify login with updated password
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: updatedPassword,
        }),
      });
      assert.equal(loginRes.status, 200);
      const loginBody = await loginRes.json();
      patientToken = loginBody.data.token;
    });

    it("should reject an already used reset token", async () => {
      const rawToken = generateResetToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: true, // already used
        },
      });

      const res = await fetch(`${baseUrl}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          newPassword: "AnotherPassword123!",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid or expired/);
    });

    it("should reject an expired reset token", async () => {
      const rawToken = generateResetToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // expired
          used: false,
        },
      });

      const res = await fetch(`${baseUrl}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          newPassword: "AnotherPassword123!",
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /expired/);
    });

    it("should enforce single-use under concurrent reset requests", async () => {
      const rawToken = generateResetToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
        },
      });

      // Fire 2 concurrent reset requests with identical token
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: rawToken,
            newPassword: "ConcurrentPass1!",
          }),
        }),
        fetch(`${baseUrl}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: rawToken,
            newPassword: "ConcurrentPass2!",
          }),
        }),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one must succeed (200) and one must be rejected (400)
      assert.ok(statuses.includes(200), "At least one request should succeed");
      assert.ok(statuses.includes(400), "One request should fail due to atomic single-use");
    });
  });

  // -------------------------------------------------------------
  // 6. ROLE PROTECTION (GET /super-admin-test)
  // -------------------------------------------------------------
  describe("Role Protection (/super-admin-test)", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/super-admin-test`);
      assert.equal(res.status, 401);
    });

    it("should reject PATIENT role with 403 Access Denied", async () => {
      const patient = await prisma.user.findUnique({ where: { id: createdUserId } });
      const currentPatientToken = jwt.sign(
        {
          userId: patient.id,
          role: "PATIENT",
          tokenVersion: patient.tokenVersion,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${baseUrl}/super-admin-test`, {
        headers: { Authorization: `Bearer ${currentPatientToken}` },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.message, "Access denied");
    });

    it("should grant access to SUPER_ADMIN role", async () => {
      // Find or create a super admin user for testing
      let superAdmin = await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
      });

      if (!superAdmin) {
        superAdmin = await prisma.user.create({
          data: {
            name: "Super Admin",
            email: `superadmin.${Date.now()}@example.com`,
            passwordHash: await bcrypt.hash("SuperSecret123!", 12),
            role: "SUPER_ADMIN",
            tokenVersion: 0,
          },
        });
      }

      superAdminToken = jwt.sign(
        {
          userId: superAdmin.id,
          role: "SUPER_ADMIN",
          tokenVersion: superAdmin.tokenVersion,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${baseUrl}/super-admin-test`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, "Super Admin access granted");
    });
  });

  // -------------------------------------------------------------
  // 7. DOWNSTREAM PROTECTED ROUTES SMOKE TESTS (REGRESSION DEFENSE)
  // -------------------------------------------------------------
  describe("Downstream Protected Routes Smoke Tests", () => {
    it("should reject unauthenticated request to /api/patients/:orgId/patients/search with 401", async () => {
      const res = await fetch(`${apiBaseUrl}/patients/00000000-0000-0000-0000-000000000000/patients/search`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.message, "Authentication required");
    });

    it("should reject revoked token on /api/patients/:orgId/patients/search with 401", async () => {
      const revokedToken = jwt.sign(
        { userId: createdUserId, role: "PATIENT", tokenVersion: 999 }, // stale version
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${apiBaseUrl}/patients/00000000-0000-0000-0000-000000000000/patients/search`, {
        headers: { Authorization: `Bearer ${revokedToken}` },
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.message, /expired or was revoked/);
    });

    it("should allow valid token to pass auth guard to downstream organization check on /api/patients", async () => {
      const patient = await prisma.user.findUnique({ where: { id: createdUserId } });
      const validToken = jwt.sign(
        { userId: patient.id, role: "PATIENT", tokenVersion: patient.tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${apiBaseUrl}/patients/00000000-0000-0000-0000-000000000000/patients/search`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      // Auth succeeds, but patient does not belong to dummy org -> 403 Forbidden
      assert.equal(res.status, 403);
    });

    it("should protect /api/organization from non-SUPER_ADMIN users", async () => {
      const patient = await prisma.user.findUnique({ where: { id: createdUserId } });
      const validPatientToken = jwt.sign(
        { userId: patient.id, role: "PATIENT", tokenVersion: patient.tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const res = await fetch(`${apiBaseUrl}/organization`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validPatientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Rogue Clinic" }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.message, "Access denied");
    });

    it("should protect /api/appointments/:orgId from unauthenticated requests", async () => {
      const res = await fetch(`${apiBaseUrl}/appointments/00000000-0000-0000-0000-000000000000`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 401);
    });
  });

  // -------------------------------------------------------------
  // 8. SECURITY CONFIGURATION & STORAGE INTEGRITY
  // -------------------------------------------------------------
  describe("Security Configuration & Token Hash Storage Integrity", () => {
    it("should return 500 when JWT_SECRET is missing during authentication", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        const res = await fetch(`${baseUrl}/me`, {
          headers: { Authorization: "Bearer dummy.token.value" },
        });

        assert.equal(res.status, 500);
        const body = await res.json();
        assert.equal(body.success, false);
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });

    it("should store only SHA-256 hashes in the database and never raw reset tokens", async () => {
      const rawToken = generateResetToken();
      const tokenHash = hashToken(rawToken);

      const tokenRecord = await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
        },
      });

      // Verify that database record stores tokenHash and NEVER contains rawToken
      assert.equal(tokenRecord.tokenHash, tokenHash);
      assert.notEqual(tokenRecord.tokenHash, rawToken);
      assert.equal(typeof tokenRecord.tokenHash, "string");
      assert.equal(tokenRecord.tokenHash.length, 64); // SHA-256 hex length
    });
  });
});

