import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won't exist if it hasn't yet been built
import * as build from "./build/server"; // eslint-disable-line import/no-unresolved
import { getLoadContext } from "./load-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRemixRequest = createRequestHandler(build as any as ServerBuild);

export default {
  async fetch(request, env, ctx) {
    try {
      console.log("Incoming request method:", request.method);
      const loadContext = getLoadContext({
        request,
        context: {
          cloudflare: {
            // This object matches the return value from Wrangler's
            // `getPlatformProxy` used during development via Remix's
            // `cloudflareDevProxyVitePlugin`:
            // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
            cf: request.cf,
            ctx: {
              waitUntil: ctx.waitUntil.bind(ctx),
              passThroughOnException: ctx.passThroughOnException.bind(ctx),
            },
            caches,
            env,
          },
        },
      });

      // Get the origin from the request
      const origin = request.headers.get("Origin") || "*";

      // Handle CORS preflight requests
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      // Handle the actual request
      const response = await handleRemixRequest(request, loadContext);

      // Add CORS headers to the response
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response("An unexpected error occurred", {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true"
        }
      });
    }
  },
} satisfies ExportedHandler<Env>;
