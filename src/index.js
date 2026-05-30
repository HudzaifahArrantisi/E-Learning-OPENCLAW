// =============================================================================
// NF Student HUB — Cloudflare Worker Reverse Proxy
// =============================================================================
//
// Forwards every incoming request to the upstream API defined by the
// TARGET_API environment variable (set in wrangler.toml).
//
// Features:
//   • Preserves original HTTP method, headers, and body
//   • Adds permissive CORS headers to every response
//   • Handles OPTIONS pre-flight requests immediately
//   • Returns a structured JSON error when the upstream fetch fails
// =============================================================================

export default {
  /**
   * Main fetch handler — the entry point for every request hitting the Worker.
   *
   * @param {Request}  request - Incoming client request
   * @param {Object}   env     - Environment bindings (vars, secrets, KV, etc.)
   * @param {Object}   ctx     - Execution context (waitUntil, passThroughOnException)
   * @returns {Response}
   */
  async fetch(request, env, ctx) {
    // -----------------------------------------------------------------------
    // 1. Respond to CORS pre-flight (OPTIONS) requests immediately
    // -----------------------------------------------------------------------
    if (request.method === "OPTIONS") {
      return handleCorsPreFlight(request);
    }

    // -----------------------------------------------------------------------
    // 2. Build the upstream URL by replacing the Worker origin with TARGET_API
    // -----------------------------------------------------------------------
    const targetBase = env.TARGET_API;

    if (!targetBase) {
      return jsonResponse(
        500,
        { error: "TARGET_API environment variable is not configured." }
      );
    }

    const url = new URL(request.url);
    const upstreamUrl = `${targetBase.replace(/\/+$/, "")}${url.pathname}${url.search}`;

    // -----------------------------------------------------------------------
    // 3. Forward the request preserving method, headers, and body
    // -----------------------------------------------------------------------
    try {
      // Clone relevant headers — omit Host so the upstream sees its own domain
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete("host");

      // Build the forwarded request
      const upstreamRequest = new Request(upstreamUrl, {
        method: request.method,
        headers: forwardHeaders,
        // GET / HEAD requests must not have a body
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        redirect: "follow",
      });

      // Execute the upstream fetch
      const upstreamResponse = await fetch(upstreamRequest);

      // -------------------------------------------------------------------
      // 4. Attach CORS headers to the upstream response and return it
      // -------------------------------------------------------------------
      return appendCorsHeaders(upstreamResponse);
    } catch (err) {
      // -------------------------------------------------------------------
      // 5. Upstream fetch failed — return a structured error
      // -------------------------------------------------------------------
      console.error("Upstream fetch error:", err);

      return jsonResponse(502, {
        error: "Bad Gateway — failed to reach the upstream API.",
        detail: err.message,
      });
    }
  },
};

// =============================================================================
// Helper — Handle CORS pre-flight (OPTIONS) requests
// =============================================================================

/**
 * Returns an immediate 204 No Content response with the appropriate CORS
 * headers so the browser allows the actual request to proceed.
 *
 * @param {Request} request - The incoming OPTIONS request
 * @returns {Response}
 */
function handleCorsPreFlight(request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("Access-Control-Request-Headers") || "*",
    "Access-Control-Max-Age": "86400", // cache pre-flight for 24 hours
  };

  return new Response(null, { status: 204, headers });
}

// =============================================================================
// Helper — Append CORS headers to an existing response
// =============================================================================

/**
 * Clones the upstream response (so headers become mutable) and appends the
 * required CORS headers.
 *
 * @param {Response} response - The original upstream response
 * @returns {Response} A new response with CORS headers attached
 */
function appendCorsHeaders(response) {
  const newResponse = new Response(response.body, response);

  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  newResponse.headers.set("Access-Control-Expose-Headers", "*");

  return newResponse;
}

// =============================================================================
// Helper — Return a JSON error response with CORS headers
// =============================================================================

/**
 * Convenience function to build a JSON response with the given status code,
 * body, and CORS headers.
 *
 * @param {number} status - HTTP status code
 * @param {Object} body   - Object to serialise as JSON
 * @returns {Response}
 */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
