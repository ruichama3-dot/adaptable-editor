import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Middleware de autenticação resiliente.
 *
 * Substitui o middleware gerado: além de validar o token localmente (getClaims,
 * que depende de JWKS), faz fallback para a verificação remota /auth/v1/user.
 * Isso evita o erro "Unauthorized: Invalid token" em produção (Vercel) quando a
 * validação por chaves assimétricas não está disponível ou mudou de formato.
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

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const SUPABASE_KEY = readEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Configuração em falta no servidor: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente (também na Vercel).",
    );
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    throw new Error("Sessão expirada. Inicie sessão novamente para continuar.");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  // 1) Validação local (rápida). 2) Fallback remoto, à prova de mudanças de JWKS.
  let userId: string | undefined;
  let claims: Record<string, unknown> = {};

  try {
    const { data } = await supabase.auth.getClaims(token);
    if (data?.claims?.sub) {
      userId = data.claims.sub;
      claims = data.claims as unknown as Record<string, unknown>;
    }
  } catch (err) {
    console.warn("[auth] getClaims falhou, a usar verificação remota:", err);
  }

  if (!userId) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      console.error("[auth] Token rejeitado pelo Supabase:", error?.message);
      throw new Error("Sessão inválida ou expirada. Termine sessão e volte a entrar.");
    }
    userId = data.user.id;
    claims = { sub: data.user.id, email: data.user.email };
  }

  return next({ context: { supabase, userId, claims } });
});
