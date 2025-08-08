import { Router, RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { authMiddleware } from "./auth_middleware.ts";

function jsonError(ctx: RouterContext<string>, status: number, message: string) {
  ctx.response.status = status;
  ctx.response.body = { error: message };
}

export function createSharingRouter(db: DatabaseSync): Router {
  const router = new Router();

  // Create sharing link (protected)
  router.post("/sharing/links", authMiddleware, async (ctx: RouterContext<"/sharing/links">) => {
    const accountId = ctx.state.accountId;
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO sharing_link (id, accountId, token, expiresAt, isActive) VALUES (?, ?, ?, ?, 1)"
    ).run(id, accountId, token, expiresAt);
    
    // Get domain from environment variable or fall back to request origin
    const shareDomain = Deno.env.get("SHARE_DOMAIN") || ctx.request.url.origin;
    const shareUrl = `${shareDomain}/share/${token}`;
    ctx.response.status = 201;
    ctx.response.body = { 
      id, 
      token, 
      shareUrl, 
      expiresAt,
      createdAt: now.toISOString()
    };
  });

  // Get sharing links for user (protected)
  router.get("/sharing/links", authMiddleware, (ctx: RouterContext<"/sharing/links">) => {
    const accountId = ctx.state.accountId;
    const links = db.prepare(
      "SELECT id, token, expiresAt, isActive, createdAt FROM sharing_link WHERE accountId = ? AND isActive = 1 ORDER BY createdAt DESC"
    ).all(accountId);
    
    // Get domain from environment variable or fall back to request origin
    const shareDomain = Deno.env.get("SHARE_DOMAIN") || ctx.request.url.origin;
    const linksWithUrls = links.map((link: any) => ({
      ...link,
      shareUrl: `${shareDomain}/share/${link.token}`
    }));
    
    ctx.response.body = linksWithUrls;
  });

  // Get sharing link by token (public)
  router.get("/sharing/links/:token", (ctx: RouterContext<"/sharing/links/:token", { token: string }>) => {
    const { token } = ctx.params;
    const link = db.prepare(
      "SELECT * FROM sharing_link WHERE token = ? AND isActive = 1 AND (expiresAt IS NULL OR expiresAt > datetime('now'))"
    ).get(token);
    
    if (!link) {
      return jsonError(ctx, 404, "Sharing link not found or expired");
    }
    
    const account = db.prepare("SELECT id, name FROM account WHERE id = ?").get(link.accountId);
    ctx.response.body = { 
      token: link.token,
      accountName: account?.name || "Unknown",
      expiresAt: link.expiresAt
    };
  });

  // Add birthday via sharing link (public)
  router.post("/sharing/links/:token/birthdays", async (ctx: RouterContext<"/sharing/links/:token/birthdays", { token: string }>) => {
    const { token } = ctx.params;
    const { name, day, month, year } = await ctx.request.body({ type: "json" }).value as { 
      name: string; 
      day: number; 
      month: number; 
      year?: number 
    };
    
    if (!name || !day || !month) {
      return jsonError(ctx, 400, "Missing name, day, or month");
    }
    
    // Verify sharing link is valid
    const link = db.prepare(
      "SELECT * FROM sharing_link WHERE token = ? AND isActive = 1 AND (expiresAt IS NULL OR expiresAt > datetime('now'))"
    ).get(token);
    
    if (!link) {
      return jsonError(ctx, 404, "Sharing link not found or expired");
    }
    
    // Add birthday to the account
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO birthday (id, accountId, name, day, month, year, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, link.accountId, name, day, month, year, now, now);
    
    ctx.response.status = 201;
    ctx.response.body = { 
      id, 
      accountId: link.accountId, 
      name, 
      day, 
      month, 
      year, 
      createdAt: now, 
      updatedAt: now 
    };
  });

  // Deactivate sharing link (protected)
  router.delete("/sharing/links/:id", authMiddleware, (ctx: RouterContext<"/sharing/links/:id", { id: string }>) => {
    const accountId = ctx.state.accountId;
    const { id } = ctx.params;
    
    const link = db.prepare("SELECT * FROM sharing_link WHERE id = ? AND accountId = ?").get(id, accountId);
    if (!link) {
      return jsonError(ctx, 404, "Sharing link not found");
    }
    
    db.prepare("UPDATE sharing_link SET isActive = 0 WHERE id = ?").run(id);
    ctx.response.status = 204;
  });

  return router;
}
