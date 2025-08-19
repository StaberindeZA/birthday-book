import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Generate a secure HMAC key for HS256 at module load (per djwt README)
export const JWT_SECRET_KEY: CryptoKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"],
);

function jsonError(ctx: RouterContext<string>, status: number, message: string) {
  ctx.response.status = status;
  ctx.response.body = { error: message };
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function sendEmail(to: string, code: string): Promise<boolean> {
  try {
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    
    // If email configuration is not set, return false
    if (!smtpHost || !smtpUser || !smtpPass) {
      return false;
    }
    
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
    });
    
    await client.send({
      from: smtpUser,
      to: to,
      subject: "Birthday Book - Login Code",
      content: `
        <h2>Your Login Code</h2>
        <p>Here's your 6-digit login code for Birthday Book:</p>
        <h1 style="color: #007bff; font-size: 2em; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">${code}</h1>
        <p><strong>This code expires in 5 minutes.</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 0.9em;">Birthday Book Application</p>
      `,
      html: true,
    });
    
    await client.close();
    return true;
    
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export function createAuthRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Request login code
  router.post("/auth/request", async (ctx: RouterContext<"/auth/request">) => {
    const { email } = await ctx.request.body({ type: "json" }).value as { email: string };
    if (!email) return jsonError(ctx, 400, "Missing email");
    
    // Check if account exists, create if it doesn't
    let account = db.prepare("SELECT * FROM account WHERE email = ?").get(email);
    if (!account) {
      const accountId = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO account (id, email, createdAt, updatedAt) VALUES (?, ?, ?, ?)"
      ).run(accountId, email, now, now);
      account = db.prepare("SELECT * FROM account WHERE email = ?").get(email);
    }
    
    const code = generateCode();
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min
    db.prepare(
      "INSERT INTO login_code (id, accountId, code, expiresAt, used) VALUES (?, ?, ?, ?, 0)"
    ).run(id, account.id, code, expiresAt);
    
    // Try to send email, fallback to console if email fails
    const emailSent = await sendEmail(email, code);
    
    if (emailSent) {
      console.log(`[LOGIN CODE] Email sent successfully to ${email}`);
      ctx.response.body = { success: true, message: "Login code sent to your email" };
    } else {
      console.log(`[LOGIN CODE] Email not configured, code logged to console: ${code}`);
      ctx.response.body = { success: true, message: "Login code logged to console (email not configured)" };
    }
  });

  // Verify code and issue JWT
  router.post("/auth/verify", async (ctx: RouterContext<"/auth/verify">) => {
    const { email, code } = await ctx.request.body({ type: "json" }).value as { email: string; code: string };
    if (!email || !code) return jsonError(ctx, 400, "Missing email or code");
    const account = db.prepare("SELECT * FROM account WHERE email = ?").get(email);
    if (!account) return jsonError(ctx, 404, "Account not found");
    const loginCode = db.prepare(
      "SELECT * FROM login_code WHERE accountId = ? AND code = ? AND used = 0 ORDER BY expiresAt DESC LIMIT 1"
    ).get(account.id, code);
    if (!loginCode) return jsonError(ctx, 401, "Invalid or expired code");
    if (new Date(loginCode.expiresAt) < new Date()) return jsonError(ctx, 401, "Code expired");
    db.prepare("UPDATE login_code SET used = 1 WHERE id = ?").run(loginCode.id);
    // Issue JWT
    const header: Header = { alg: "HS256", typ: "JWT" };
    const payload: Payload = {
      iss: "birthday-book",
      sub: account.id,
      email: account.email,
      name: account.name,
      exp: getNumericDate(60 * 60), // 1 hour
    };
    const jwt = await create(header, payload, JWT_SECRET_KEY);
    ctx.response.body = { token: jwt };
  });

  return router;
} 