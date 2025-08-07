import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { authMiddleware } from "./auth_middleware.ts";

function jsonError(ctx: RouterContext<string>, status: number, message: string) {
  ctx.response.status = status;
  ctx.response.body = { error: message };
}

export function createBirthdayRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Protect all birthday endpoints
  router.use(authMiddleware);

  router.get("/accounts/:accountId/birthdays", (ctx: RouterContext<"/accounts/:accountId/birthdays", { accountId: string }>) => {
    const { accountId } = ctx.params;
    if (ctx.state.accountId !== accountId) return jsonError(ctx, 403, "Forbidden");
    const account = db.prepare("SELECT * FROM account WHERE id = ?").get(accountId);
    if (!account) return jsonError(ctx, 404, "Account not found");
    const birthdays = db.prepare("SELECT * FROM birthday WHERE accountId = ?").all(accountId);
    ctx.response.body = birthdays;
  });

  router.post("/accounts/:accountId/birthdays", async (ctx: RouterContext<"/accounts/:accountId/birthdays", { accountId: string }>) => {
    const { accountId } = ctx.params;
    if (ctx.state.accountId !== accountId) return jsonError(ctx, 403, "Forbidden");
    const account = db.prepare("SELECT * FROM account WHERE id = ?").get(accountId);
    if (!account) return jsonError(ctx, 404, "Account not found");
    const { name, day, month, year } = await ctx.request.body({ type: "json" }).value as { name: string; day: number; month: number; year?: number };
    if (!name || !day || !month) return jsonError(ctx, 400, "Missing name, day, or month");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO birthday (id, accountId, name, day, month, year, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, accountId, name, day, month, year, now, now);
    ctx.response.status = 201;
    ctx.response.body = { id, accountId, name, day, month, year, createdAt: now, updatedAt: now };
  });

  router.get("/birthdays/:id", (ctx: RouterContext<"/birthdays/:id", { id: string }>) => {
    const { id } = ctx.params;
    const birthday = db.prepare("SELECT * FROM birthday WHERE id = ?").get(id);
    if (!birthday) return jsonError(ctx, 404, "Birthday not found");
    if (birthday.accountId !== ctx.state.accountId) return jsonError(ctx, 403, "Forbidden");
    ctx.response.body = birthday;
  });

  router.put("/birthdays/:id", async (ctx: RouterContext<"/birthdays/:id", { id: string }>) => {
    const { id } = ctx.params;
    const birthday = db.prepare("SELECT * FROM birthday WHERE id = ?").get(id);
    if (!birthday) return jsonError(ctx, 404, "Birthday not found");
    if (birthday.accountId !== ctx.state.accountId) return jsonError(ctx, 403, "Forbidden");
    const { name, day, month, year } = await ctx.request.body({ type: "json" }).value as { name?: string; day?: number; month?: number; year?: number };
    if (!name && !day && !month && !year) return jsonError(ctx, 400, "Nothing to update");
    const updatedAt = new Date().toISOString();
    db.prepare(
      "UPDATE birthday SET name = COALESCE(?, name), day = COALESCE(?, day), month = COALESCE(?, month), year = COALESCE(?, year), updatedAt = ? WHERE id = ?"
    ).run(name, day, month, year, updatedAt, id);
    ctx.response.body = { ...birthday, name: name ?? birthday.name, day: day ?? birthday.day, month: month ?? birthday.month, year: year ?? birthday.year, updatedAt };
  });

  router.delete("/birthdays/:id", (ctx: RouterContext<"/birthdays/:id", { id: string }>) => {
    const { id } = ctx.params;
    const birthday = db.prepare("SELECT * FROM birthday WHERE id = ?").get(id);
    if (!birthday) return jsonError(ctx, 404, "Birthday not found");
    if (birthday.accountId !== ctx.state.accountId) return jsonError(ctx, 403, "Forbidden");
    const result = db.prepare("DELETE FROM birthday WHERE id = ?").run(id);
    ctx.response.body = { success: true };
  });

  return router;
} 