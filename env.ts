// Load environment variables from .env file
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

export async function loadEnv() {
  try {
    const env = await load();
    // Set environment variables
    for (const [key, value] of Object.entries(env)) {
      Deno.env.set(key, value);
    }
    console.log("✅ Environment variables loaded from .env file");
  } catch (error) {
    console.log("ℹ️  No .env file found, using system environment variables");
  }
}
