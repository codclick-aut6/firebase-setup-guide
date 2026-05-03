import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      if (!currentUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("firebase_id", currentUser.uid)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar role no Supabase:", error);
          setRole("user");
        } else {
          console.log("Role encontrada no Supabase:", data?.role);
          setRole(data?.role || "user");
        }
      } catch (error) {
        console.error("Erro ao consultar role:", error);
        setRole("user");
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, [currentUser]);

  return {
    role,
    loading,
    isAdmin: role === "admin" || role === "super-admin",
    isSuperAdmin: role === "super-admin",
  };
};
