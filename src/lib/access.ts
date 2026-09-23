import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { planById, FREE_DAILY_LIMIT } from "@/lib/plans";

export type Access = {
  isAdmin: boolean;
  hasAccess: boolean;
  plan: string | null;
  dailyLimit: number;
  expiresAt: string | null;
  /** Origem do acesso: "admin" | "subscription" | "payment" | "none" */
  source: "admin" | "subscription" | "payment" | "none";
};

const APPROVED = ["aprovado", "approved", "aprovada", "pago"];

/**
 * Determina o acesso do utilizador de forma resiliente:
 * 1. Administrador → acesso ilimitado.
 * 2. Subscrição activa.
 * 3. Pagamento aprovado ainda dentro da validade do plano (mesmo sem subscrição criada).
 */
export async function resolveAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Access> {
  // 1. Administrador
  let isAdmin = false;
  const { data: roleRpc, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    isAdmin = (roleRows?.length ?? 0) > 0;
  } else {
    isAdmin = roleRpc === true;
  }

  if (isAdmin) {
    return {
      isAdmin: true,
      hasAccess: true,
      plan: "admin",
      dailyLimit: 0, // 0 = sem limite
      expiresAt: null,
      source: "admin",
    };
  }

  const now = Date.now();

  // 2. Subscrição activa
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan, daily_limit, expires_at")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(5);

  const activeSub = (subs ?? []).find((s) => new Date(s.expires_at).getTime() > now);
  if (activeSub) {
    return {
      isAdmin: false,
      hasAccess: true,
      plan: activeSub.plan,
      dailyLimit: activeSub.daily_limit ?? FREE_DAILY_LIMIT,
      expiresAt: activeSub.expires_at,
      source: "subscription",
    };
  }

  // 3. Pagamento aprovado sem subscrição criada
  const { data: payments } = await supabase
    .from("payment_requests")
    .select("plan, status, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  for (const p of payments ?? []) {
    if (!APPROVED.includes(String(p.status ?? "").toLowerCase())) continue;
    const plan = planById(p.plan);
    if (!plan) continue;
    const start = new Date(p.updated_at ?? p.created_at).getTime();
    const expires = start + plan.days * 24 * 60 * 60 * 1000;
    if (expires > now) {
      return {
        isAdmin: false,
        hasAccess: true,
        plan: plan.id,
        dailyLimit: plan.dailyLimit,
        expiresAt: new Date(expires).toISOString(),
        source: "payment",
      };
    }
  }

  return {
    isAdmin: false,
    hasAccess: false,
    plan: null,
    dailyLimit: FREE_DAILY_LIMIT,
    expiresAt: null,
    source: "none",
  };
}
