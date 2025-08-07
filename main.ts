// @deno-types="https://deno.land/x/oak@v12.6.1/mod.ts"
import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { DatabaseSync } from "node:sqlite";
import { createAccountRouter } from "./account_api.ts";
import { createBirthdayRouter } from "./birthday_api.ts";
import { createAuthRouter } from "./auth_api.ts";

const db: DatabaseSync = new DatabaseSync("birthday_book.db");

const app: Application = new Application();
app.use(createAccountRouter(db).routes());
app.use(createAccountRouter(db).allowedMethods());
app.use(createBirthdayRouter(db).routes());
app.use(createBirthdayRouter(db).allowedMethods());
app.use(createAuthRouter(db).routes());
app.use(createAuthRouter(db).allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 }); 