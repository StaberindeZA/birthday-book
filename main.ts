// @deno-types="https://deno.land/x/oak@v12.6.1/mod.ts"
import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { createAccountRouter } from "./account_api.ts";
import { createBirthdayRouter } from "./birthday_api.ts";
import { createAuthRouter } from "./auth_api.ts";

const db: DatabaseSync = new DatabaseSync("birthday_book.db");

const app: Application = new Application();

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set('Access-Control-Allow-Origin', '*');
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});

// Serve static files from public directory
app.use(async (ctx, next) => {
  try {
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

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 }); 