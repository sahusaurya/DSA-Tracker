import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Locks the server to the desktop window that started it.
 *
 * The app talks to itself over a loopback port, and a port with no authentication is
 * reachable by more than the app: a web page you visit can send it a cross-origin POST
 * (a `text/plain` body needs no preflight, so the browser just sends it), and on a shared
 * computer every other user account can reach 127.0.0.1 too. Neither can read this token —
 * the browser never sees the header, and CORS blocks reading our responses — so requiring
 * it closes both without giving up the port.
 *
 * Named `proxy` because Next 16 renamed the `middleware` convention to `proxy`.
 */
const HEADER = "x-dsa-token";

export function proxy(request: NextRequest) {
  // Read per request: the value is supplied at launch, not baked in at build time.
  const expected = process.env.DSA_APP_TOKEN;

  // No token configured means nobody is enforcing one — a plain `next build`, or a
  // deliberately unauthenticated run. The desktop app always sets it.
  if (!expected) return NextResponse.next();

  if (request.headers.get(HEADER) === expected) return NextResponse.next();

  return new NextResponse("Forbidden", {
    status: 403,
    headers: { "content-type": "text/plain" },
  });
}
