import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Middleware de autenticação resiliente para produção (Vercel).
 *
 * Em vez de depender apenas das variáveis de ambiente do servidor, a validação
 * usa o emissor (`iss`) declarado no próprio access_token. Assim, mesmo que as
 * variáveis da Vercel apontem para outro projecto (ou faltem), o token é
 * verificado contra o Supabase que o emitiu — era esta divergência que
 * produzia "Sessão inválida ou expirada" só em produção.
 */

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

type JwtPayload = { sub?: string; iss?: string; exp?: number; email?: string };

function decodeJwt(token: string): JwtPayload | undefined {
  try {
    const part = token.split(".")[1];
    if (!part) return undefined;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return undefined;
  }
}

/** Deriva a URL base do Supabase a partir do `iss` do token (…/auth/v1). */
function baseUrlFromIssuer(iss?: string): string | undefined {
  if (!iss) return undefined;
  try {
    const url = new URL(iss);
    return `${url.origin}${url.pathname.replace(/\/auth\/v1\/?$/, "")}`.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    throw new Error("Sessão expirada. Inicie sessão novamente para continuar.");
  }

  const payload = decodeJwt(token);

  if (payload?.exp && payload.exp * 1000 < Date.now() - 5_000) {
    throw new Error("A sua sessão expirou. Actualize a página ou volte a entrar.");
  }

  const ENV_URL = readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  // A URL do emissor do token tem prioridade: é sempre o projecto certo.
  const SUPABASE_URL = baseUrlFromIssuer(payload?.iss) ?? ENV_URL;
  const SUPABASE_KEY = readEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Configuração em falta no servidor: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente (também na Vercel).",
    );
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  let userId: string | undefined;
  let claims: Record<string, unknown> = {};

  // 1) Verificação remota (fiável em qualquer runtime, sem depender de JWKS).
  const { data, error } = await supabase.auth.getUser(token);
  if (data?.user?.id) {
    userId = data.user.id;
    claims = { sub: data.user.id, email: data.user.email };
  } else {
    // 2) Fallback: validação local das claims (caso a rede /auth/v1/user falhe).
    try {
      const local = await supabase.auth.getClaims(token);
      if (local.data?.claims?.sub) {
        userId = local.data.claims.sub;
        claims = local.data.claims as unknown as Record<string, unknown>;
      }
    } catch (err) {
      console.warn("[auth] getClaims também falhou:", err);
    }
  }

  if (!userId) {
    console.error("[auth] Token rejeitado", {
      issuer: payload?.iss,
      supabaseUrl: SUPABASE_URL,
      envUrl: ENV_URL,
      reason: error?.message,
    });
    throw new Error("Sessão inválida ou expirada. Termine sessão e volte a entrar.");
  }

  return next({ context: { supabase, userId, claims } });
});
