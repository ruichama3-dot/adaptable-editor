import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Anexa o token da sessão a cada chamada de servidor.
 *
 * Diferença face ao anexador gerado: renova a sessão quando o token está
 * expirado ou prestes a expirar (margem de 60s). Sem isto, em produção o
 * navegador enviava um access_token já expirado e o servidor devolvia
 * "Sessão inválida ou expirada".
 */
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;

  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? undefined;
    const expiresAt = session?.expires_at ?? 0;
    const nearExpiry = expiresAt > 0 && expiresAt * 1000 - Date.now() < 60_000;

    if (session && nearExpiry) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? session.access_token;
    } else {
      token = session?.access_token;
    }
  } catch (err) {
    console.warn("[auth] Não foi possível obter a sessão:", err);
  }

  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
