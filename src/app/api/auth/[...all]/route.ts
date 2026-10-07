import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/auth";

async function handlers() {
  return toNextJsHandler(await getAuth());
}

export async function GET(request: Request) {
  return handleRequest(request, "GET");
}

export async function POST(request: Request) {
  return handleRequest(request, "POST");
}

async function handleRequest(request: Request, method: "GET" | "POST") {
  try {
    return await (await handlers())[method](request);
  } catch {
    // Do not expose configuration, provider errors, or credentials to the browser.
    return Response.json({ code: "AUTH_SERVICE_UNAVAILABLE", message: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}
