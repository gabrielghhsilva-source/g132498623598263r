import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Gate de autenticação Supabase.
 * Bloqueia o app se não houver sessão válida. Camada ANTES do PasswordGate do app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Registra listener PRIMEIRO (regra Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setLoading(false);
    });

    // Depois verifica sessão existente
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
