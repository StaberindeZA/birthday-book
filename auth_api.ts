import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

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

export function createAuthRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Request login code
  router.post("/auth/request", async (ctx: RouterContext<"/auth/request">) => {
    const { email } = await ctx.request.body({ type: "json" }).value as { email: string };
    if (!email) return jsonError(ctx, 400, "Missing email");
    const account = db.prepare("SELECT * FROM account WHERE email = ?").get(email);
    if (!account) return jsonError(ctx, 404, "Account not found");
    const code = generateCode();
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min
    db.prepare(
      "INSERT INTO login_code (id, accountId, code, expiresAt, used) VALUES (?, ?, ?, ?, 0)"
    ).run(id, account.id, code, expiresAt);
    // Simulate sending email by logging to console
    console.log(`[LOGIN CODE] Email to ${email}: ${code}`);
    ctx.response.body = { success: true };
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