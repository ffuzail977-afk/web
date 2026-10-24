type Handler = (request: Request) => Response | Promise<Response>;

const PRIVATE_REQUEST_HEADERS = [
  "authorization",
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-url",
  "next-action",
  "x-prerender-revalidate",
];
const SUPPORTED_VARY = new Set([
  "accept",
  "accept-encoding",
  "user-agent",
  ...PRIVATE_REQUEST_HEADERS,
]);

function assetKey(path: string) {
  try {
    return path.split("/").map(decodeURIComponent).map(encodeURIComponent).join("/");
  } catch {
    return "";
  }
}

/** CDN policy for Composer's public files/HTML; Vercel keeps its own caching. */
export function withOriginCache(
  handler: Handler,
  publicAssets: ReadonlySet<string> = new Set(),
): Handler {
  return async (request) => {
    const response = await handler(request);
    const url = new URL(request.url);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const prerendered = /(?:^|,)\s*1\s*(?:,|$)/.test(
      response.headers.get("x-nextjs-prerender") ?? "",
    );
    const asset = publicAssets.has(assetKey(url.pathname));
    // Preserve framework cache policy, streaming and byte ranges.
    // A conditional HTML response can omit Content-Type, but must retain its
    // freshness cap when the CDN merges the 304 headers into its cached copy.
    if (
      !asset &&
      !/^text\/html(?:;|$)/.test(contentType) &&
      !(response.status === 304 && prerendered)
    )
      return response;
    // An explicit app-owned CDN policy is authoritative.
    if (
      response.headers.has("cdn-cache-control") ||
      response.headers.has("cloudflare-cdn-cache-control")
    )
      return response;

    const headers = new Headers(response.headers);
    const control = headers.get("cache-control")?.toLowerCase() ?? "";
    const sharedAge = Number(control.match(/(?:^|,)\s*s-maxage\s*=\s*(\d+)\s*(?:,|$)/)?.[1] ?? 0);
    const publicFile = asset && /(?:^|,)\s*public\s*(?:,|$)/.test(control);
    // An app's positive public-file lifetime already enables edge reuse.
    if (publicFile && /(?:^|,)\s*(?:s-maxage|max-age)\s*=\s*[1-9]\d*\s*(?:,|$)/.test(control))
      return response;
    const accept = request.headers.get("accept")?.toLowerCase() ?? "";
    const cacheable =
      ["GET", "HEAD"].includes(request.method) &&
      [200, 206, 304].includes(response.status) &&
      !/(?:^|,)\s*(?:private|no-store|no-cache)\b/.test(control) &&
      !headers.has("set-cookie") &&
      !(headers.get("vary") ?? "")
        .split(",")
        .some((name) => name.trim() && !SUPPORTED_VARY.has(name.trim().toLowerCase())) &&
      !PRIVATE_REQUEST_HEADERS.some((name) => request.headers.has(name)) &&
      !url.searchParams.has("_rsc");
    const publicHtml =
      cacheable &&
      !asset &&
      response.status !== 206 &&
      prerendered &&
      sharedAge > 0 &&
      accept.includes("text/html") &&
      !accept.includes("text/markdown") &&
      !accept.includes("text/x-component");
    // A prerendered HTML document is independent of cookies/query parameters.
    // Dynamic pages, APIs and Next navigation never qualify. The edge retains
    // the full query string in its cache key; no parameters are discarded.
    const publicAsset = cacheable && publicFile;

    // A short freshness window bounds staleness without deployment-time purge
    // credentials. Browsers revalidate; CDNs can reuse public HTML for a minute.
    headers.set(
      "cdn-cache-control",
      publicHtml || publicAsset
        ? `public, max-age=${publicHtml ? Math.min(sharedAge, 60) : 60}, stale-while-revalidate=300`
        : "no-store",
    );
    if (publicHtml) headers.set("cache-control", "public, max-age=0");
    // Already-compressed media should retain Content-Length and byte ranges
    // through a CDN. Leave text/SVG compression enabled.
    if (publicAsset && /^(?:image\/(?!svg\+xml)|audio\/|video\/|font\/)/.test(contentType))
      headers.set("cache-control", `${control}, no-transform`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
