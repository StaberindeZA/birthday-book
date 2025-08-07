import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { authMiddleware } from "./auth_middleware.ts";

function getDaysUntilNextBirthday(month: number, day: number): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Create date for this year's birthday
  const thisYearBirthday = new Date(currentYear, month - 1, day);
  
  // If birthday has passed this year, use next year's date
  if (thisYearBirthday < today) {
    thisYearBirthday.setFullYear(currentYear + 1);
  }
  
  // Calculate days difference
  const diffTime = thisYearBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function jsonError(ctx: RouterContext<string>, status: number, message: string) {
  ctx.response.status = status;
  ctx.response.body = { error: message };
}

export function createBirthdayRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Protect all birthday endpoints
  router.use(authMiddleware);

  // New simplified endpoints for frontend
  router.get("/birthdays", (ctx: RouterContext<"/birthdays">) => {
    const accountId = ctx.state.accountId;
    const birthdays = db.prepare("SELECT * FROM birthday WHERE accountId = ?").all(accountId);
    
    // Add days until next birthday to each birthday
    const birthdaysWithDays = birthdays.map((birthday: any) => ({
      ...birthday,
      daysUntilNextBirthday: getDaysUntilNextBirthday(birthday.month, birthday.day)
    }));
    
    // Sort by days until next birthday
    birthdaysWithDays.sort((a: any, b: any) => a.daysUntilNextBirthday - b.daysUntilNextBirthday);
    
    ctx.response.body = birthdaysWithDays;
  });

  router.post("/birthdays", async (ctx: RouterContext<"/birthdays">) => {
    const accountId = ctx.state.accountId;
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

  router.delete("/birthdays/:id", (ctx: RouterContext<"/birthdays/:id", { id: string }>) => {
    const accountId = ctx.state.accountId;
    const { id } = ctx.params;
    
    // First check if the birthday exists and belongs to this account
    const birthday = db.prepare("SELECT * FROM birthday WHERE id = ? AND accountId = ?").get(id, accountId);
    if (!birthday) return jsonError(ctx, 404, "Birthday not found");
    
    // Delete the birthday
    db.prepare("DELETE FROM birthday WHERE id = ? AND accountId = ?").run(id, accountId);
    
    ctx.response.status = 204; // No content
  });

  // Original endpoints kept for backward compatibility
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