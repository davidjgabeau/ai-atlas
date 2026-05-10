import type { NextRequest } from "next/server";

const embedOriginEnv = "AI_ATLAS_EMBED_ORIGINS";
const defaultAllowedOrigins = [
  "https://aiatlas.nyc",
  "https://www.aiatlas.nyc",
  "https://davidgabeau.com",
  "https://www.davidgabeau.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

type EmbedCorsOptions = {
  methods: string[];
  allowedHeaders?: string[];
  allowAnyOrigin?: boolean;
  allowAnyOriginFallback?: boolean;
  maxAgeSeconds?: number;
};

export type EmbedCorsResult = {
  allowed: boolean;
  headers: Headers;
  origin?: string;
};

export function getEmbedCorsResult(
  request: NextRequest,
  options: EmbedCorsOptions,
): EmbedCorsResult {
  const headers = new Headers();
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));
  const configuredOrigins = getConfiguredEmbedOrigins();
  const usesConfiguredOrigins = configuredOrigins.length > 0;
  const allowAnyOrigin =
    options.allowAnyOrigin === true ||
    configuredOrigins.includes("*") ||
    (!usesConfiguredOrigins && options.allowAnyOriginFallback === true);
  const allowedOrigins = usesConfiguredOrigins
    ? configuredOrigins
    : defaultAllowedOrigins;

  headers.set("Access-Control-Allow-Methods", options.methods.join(", "));
  headers.set(
    "Access-Control-Allow-Headers",
    (options.allowedHeaders ?? ["Content-Type"]).join(", "),
  );
  headers.set(
    "Access-Control-Max-Age",
    String(options.maxAgeSeconds ?? 60 * 60),
  );

  if (!requestOrigin) {
    return {
      allowed: true,
      headers,
    };
  }

  if (allowAnyOrigin) {
    headers.set("Access-Control-Allow-Origin", "*");
    return {
      allowed: true,
      headers,
      origin: requestOrigin,
    };
  }

  headers.set("Vary", "Origin");
  if (allowedOrigins.includes(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    return {
      allowed: true,
      headers,
      origin: requestOrigin,
    };
  }

  return {
    allowed: false,
    headers,
    origin: requestOrigin,
  };
}

export function createEmbedCorsPreflightResponse(
  request: NextRequest,
  options: EmbedCorsOptions,
) {
  const cors = getEmbedCorsResult(request, options);
  return new Response(null, {
    status: cors.allowed ? 204 : 403,
    headers: cors.headers,
  });
}

function getConfiguredEmbedOrigins() {
  return (process.env[embedOriginEnv] ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

function normalizeOrigin(value: string | null | undefined) {
  const cleanValue = (value ?? "").trim().replace(/\/+$/, "");
  if (!cleanValue) return "";
  if (cleanValue === "*") return "*";

  try {
    return new URL(cleanValue).origin;
  } catch {
    return cleanValue;
  }
}
