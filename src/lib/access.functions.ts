import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-guard";
import { resolveAccess, type Access } from "@/lib/access";

/** Devolve o acesso do utilizador autenticado (admin, subscrição ou pagamento aprovado). */
export const getAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<Access> => {
    return resolveAccess(context.supabase, context.userId);
  });
