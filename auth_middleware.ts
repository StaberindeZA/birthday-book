import { RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { JWT_SECRET_KEY } from "./auth_api.ts";

export async function authMiddleware(ctx: RouterContext<string>, next: () => Promise<unknown>) {
  const auth = ctx.request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Missing or invalid Authorization header" };
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = await verify(token, JWT_SECRET_KEY, "HS256");
    ctx.state.accountId = payload.sub;
    ctx.state.jwtPayload = payload;
    await next();
  } catch (e) {
    console.log(e);
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid or expired token" };
  }
} 