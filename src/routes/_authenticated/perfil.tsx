import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil | RuJe IA" },
      { name: "description", content: "Edite os seus dados de conta na RuJe IA." },
      { property: "og:title", content: "Perfil | RuJe IA" },
      { property: "og:description", content: "Edite os seus dados de conta." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: String(f.get("full_name")),
      phone: String(f.get("phone")),
      institution: String(f.get("institution")),
      course: String(f.get("course")),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Perfil actualizado.");
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-extrabold">Configurações da conta</h1>
      <form onSubmit={onSubmit} className="shadow-soft mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={user.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n">Nome completo</Label>
          <Input id="n" name="full_name" defaultValue={profile?.full_name ?? ""} key={profile?.full_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t">Telefone</Label>
          <Input id="t" name="phone" defaultValue={profile?.phone ?? ""} key={profile?.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i">Instituição</Label>
          <Input id="i" name="institution" defaultValue={profile?.institution ?? ""} key={profile?.institution} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c">Curso</Label>
          <Input id="c" name="course" defaultValue={profile?.course ?? ""} key={profile?.course} />
        </div>
        <Button type="submit">Guardar alterações</Button>
      </form>
    </main>
  );
}
