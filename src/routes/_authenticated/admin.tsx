import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, FileText, Wallet, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel de administração | RuJe IA" },
      { name: "description", content: "Gestão de utilizadores, trabalhos e pagamentos da RuJe IA." },
      { property: "og:title", content: "Painel de administração | RuJe IA" },
      { property: "og:description", content: "Todos os dados da plataforma RuJe IA num só lugar." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, isLoading } = useIsAdmin();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });

  const { data: works = [] } = useQuery({
    queryKey: ["admin-works"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subs"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("subscriptions").select("*")).data ?? [],
  });

  async function decide(p: (typeof payments)[number], approve: boolean) {
    if (approve) {
      const plan = PLANS.find((x) => x.name === p.plan) ?? PLANS[0]!;
      const expires = new Date(Date.now() + plan.days * 86400000).toISOString();
      const { error } = await supabase.from("subscriptions").insert({
        user_id: p.user_id,
        plan: plan.name,
        daily_limit: plan.dailyLimit,
        expires_at: expires,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    const { error } = await supabase
      .from("payment_requests")
      .update({ status: approve ? "aprovado" : "rejeitado" })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
    toast.success(approve ? "Plano activado para o utilizador." : "Pedido rejeitado.");
  }

  if (isLoading) return <main className="mx-auto max-w-6xl px-5 py-10 text-muted-foreground">A verificar acesso…</main>;

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-extrabold">Acesso restrito</h1>
        <p className="text-muted-foreground mt-2">Esta área é exclusiva dos administradores da RuJe IA.</p>
        <Button asChild className="mt-5">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </main>
    );
  }

  const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));
  const pendentes = payments.filter((p) => p.status === "pendente").length;
  const stats = [
    { icon: Users, label: "Utilizadores", value: users.length },
    { icon: FileText, label: "Trabalhos criados", value: works.length },
    { icon: Wallet, label: "Pagamentos pendentes", value: pendentes },
    { icon: ShieldCheck, label: "Planos activos", value: subs.filter((s) => new Date(s.expires_at) > new Date()).length },
  ];

  const cell = "px-3 py-2.5 align-top";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold">
        <ShieldCheck className="h-7 w-7 text-primary" /> Painel de administração
      </h1>
      <p className="text-muted-foreground mt-1">Todos os utilizadores, trabalhos e pagamentos da plataforma.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="shadow-soft rounded-2xl border border-border bg-card p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <s.icon className="h-4 w-4" /> {s.label}
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="pagamentos" className="mt-8">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="utilizadores">Utilizadores</TabsTrigger>
          <TabsTrigger value="trabalhos">Trabalhos</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          <div className="shadow-soft mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className={cell}>Nome</th>
                  <th className={cell}>Número</th>
                  <th className={cell}>Plano</th>
                  <th className={cell}>Método</th>
                  <th className={cell}>Comprovativo</th>
                  <th className={cell}>Estado</th>
                  <th className={cell}>Acção</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className={cell}>{p.full_name}</td>
                    <td className={cell}>{p.phone}</td>
                    <td className={cell}>
                      {p.plan}
                      <br />
                      <span className="text-muted-foreground">{p.amount} MT</span>
                    </td>
                    <td className={cell}>{p.method}</td>
                    <td className={`${cell} max-w-xs whitespace-pre-wrap`}>{p.proof}</td>
                    <td className={`${cell} capitalize`}>{p.status}</td>
                    <td className={cell}>
                      {p.status === "pendente" ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => decide(p, true)}>
                            <CheckCircle2 className="h-4 w-4" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => decide(p, false)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td className={`${cell} text-muted-foreground`} colSpan={7}>
                      Ainda não há pedidos de pagamento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="utilizadores">
          <div className="shadow-soft mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className={cell}>Nome</th>
                  <th className={cell}>E-mail</th>
                  <th className={cell}>Telefone</th>
                  <th className={cell}>Instituição</th>
                  <th className={cell}>Trabalhos</th>
                  <th className={cell}>Plano</th>
                  <th className={cell}>Registo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const sub = subs.find((s) => s.user_id === u.id && new Date(s.expires_at) > new Date());
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className={cell}>
                        {u.full_name || "—"}
                        {adminIds.has(u.id) && (
                          <span className="bg-brand ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td className={cell}>{u.email ?? "—"}</td>
                      <td className={cell}>{u.phone ?? "—"}</td>
                      <td className={cell}>{u.institution ?? "—"}</td>
                      <td className={cell}>{works.filter((w) => w.user_id === u.id).length}</td>
                      <td className={cell}>{adminIds.has(u.id) ? "Ilimitado" : (sub?.plan ?? "Grátis")}</td>
                      <td className={cell}>{new Date(u.created_at).toLocaleDateString("pt-PT")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="trabalhos">
          <div className="shadow-soft mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className={cell}>Título</th>
                  <th className={cell}>Tipo</th>
                  <th className={cell}>Modalidade</th>
                  <th className={cell}>Autor</th>
                  <th className={cell}>Downloads</th>
                  <th className={cell}>Criado</th>
                </tr>
              </thead>
              <tbody>
                {works.map((w) => {
                  const author = users.find((u) => u.id === w.user_id);
                  return (
                    <tr key={w.id} className="border-t border-border">
                      <td className={cell}>{w.title}</td>
                      <td className={cell}>{w.work_type}</td>
                      <td className={cell}>{w.work_mode === "grupo" ? "Grupo" : "Individual"}</td>
                      <td className={cell}>{author?.full_name || author?.email || "—"}</td>
                      <td className={cell}>{w.download_count}</td>
                      <td className={cell}>{new Date(w.created_at).toLocaleDateString("pt-PT")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
