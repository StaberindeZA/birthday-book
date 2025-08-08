// @deno-types="https://deno.land/x/oak@v12.6.1/mod.ts"
import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { createAccountRouter } from "./account_api.ts";
import { createBirthdayRouter } from "./birthday_api.ts";
import { createAuthRouter } from "./auth_api.ts";
import { createSharingRouter } from "./sharing_api.ts";
import { loadEnv } from "./env.ts";

const databasePath = Deno.env.get("DATABASE_PATH") || "birthday_book.db";
const db: DatabaseSync = new DatabaseSync(databasePath);

// Load environment variables from .env file
await loadEnv();

const app: Application = new Application();

// CORS middleware
app.use(async (ctx, next) => {
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || ["http://localhost:8000"];
  const origin = ctx.request.headers.get("origin");
  
  if (origin && allowedOrigins.includes(origin)) {
    ctx.response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  ctx.response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  await next();
});

// Serve static files from public directory
app.use(async (ctx, next) => {
  try {
    // Handle share routes specifically
    if (ctx.request.url.pathname.startsWith('/share/')) {
      await ctx.send({
        root: `${Deno.cwd()}/public`,
        path: "share.html",
      });
      return;
    }
    
    await ctx.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(createAccountRouter(db).routes());
app.use(createAccountRouter(db).allowedMethods());
app.use(createBirthdayRouter(db).routes());
app.use(createBirthdayRouter(db).allowedMethods());
app.use(createAuthRouter(db).routes());
app.use(createAuthRouter(db).allowedMethods());
app.use(createSharingRouter(db).routes());
app.use(createSharingRouter(db).allowedMethods());

const port = parseInt(Deno.env.get("PORT") || "8000");
const shareDomain = Deno.env.get("SHARE_DOMAIN");

console.log(`Server running on http://localhost:${port}`);
if (shareDomain) {
  console.log(`Share links will use domain: ${shareDomain}`);
} else {
  console.log("Share links will use request origin (no SHARE_DOMAIN set)");
}

await app.listen({ port }); 