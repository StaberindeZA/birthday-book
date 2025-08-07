import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { authMiddleware } from "./auth_middleware.ts";

function jsonError(ctx: RouterContext<string>, status: number, message: string) {
  ctx.response.status = status;
  ctx.response.body = { error: message };
}

export function createAccountRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Protect all account endpoints
  router.use(authMiddleware);

  // GET /accounts: Only return the authenticated user's account
  router.get("/accounts", (ctx: RouterContext<"/accounts">) => {
    const id = ctx.state.accountId;
    const account = db.prepare("SELECT * FROM account WHERE id = ?").get(id);
    if (!account) return jsonError(ctx, 404, "Account not found");
    ctx.response.body = [account];
  });

  // POST /accounts: Allow creation if email does not exist, set id to JWT sub
  router.post("/accounts", async (ctx: RouterContext<"/accounts">) => {
    const { email, name } = await ctx.request.body({ type: "json" }).value as { email: string; name: string };
    if (!email || !name) return jsonError(ctx, 400, "Missing email or name");
    const existing = db.prepare("SELECT * FROM account WHERE email = ?").get(email);
    if (existing) return jsonError(ctx, 409, "Email already exists");
    //const id = ctx.state.accountId;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO account (id, email, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
    ).run(id, email, name, now, now);
    ctx.response.status = 201;
    ctx.response.body = { id, email, name, createdAt: now, updatedAt: now };
  });

  router.get("/accounts/:id", (ctx: RouterContext<"/accounts/:id", { id: string }>) => {
    const { id } = ctx.params;
    if (ctx.state.accountId !== id) return jsonError(ctx, 403, "Forbidden");
    const account = db.prepare("SELECT * FROM account WHERE id = ?").get(id);
    if (!account) return jsonError(ctx, 404, "Account not found");
    ctx.response.body = account;
  });

  router.put("/accounts/:id", async (ctx: RouterContext<"/accounts/:id", { id: string }>) => {
    const { id } = ctx.params;
    if (ctx.state.accountId !== id) return jsonError(ctx, 403, "Forbidden");
    const account = db.prepare("SELECT * FROM account WHERE id = ?").get(id);
    if (!account) return jsonError(ctx, 404, "Account not found");
    const { email, name } = await ctx.request.body({ type: "json" }).value as { email?: string; name?: string };
    if (!email && !name) return jsonError(ctx, 400, "Nothing to update");
    const updatedAt = new Date().toISOString();
    db.prepare(
      "UPDATE account SET email = COALESCE(?, email), name = COALESCE(?, name), updatedAt = ? WHERE id = ?"
    ).run(email, name, updatedAt, id);
    ctx.response.body = { ...account, email: email ?? account.email, name: name ?? account.name, updatedAt };
  });

  router.delete("/accounts/:id", (ctx: RouterContext<"/accounts/:id", { id: string }>) => {
    const { id } = ctx.params;
    if (ctx.state.accountId !== id) return jsonError(ctx, 403, "Forbidden");
    const result = db.prepare("DELETE FROM account WHERE id = ?").run(id);
    if (result.changes === 0) return jsonError(ctx, 404, "Account not found");
    ctx.response.body = { success: true };
  });

  return router;
} 