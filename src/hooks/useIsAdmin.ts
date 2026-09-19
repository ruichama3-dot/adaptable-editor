import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin");
      if (error) return false;
      return (rows?.length ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { isAdmin: data === true, isLoading };
}
