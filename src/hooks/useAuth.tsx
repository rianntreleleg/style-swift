import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/config/themes";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  currentTenant: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<any | null>(null);

  const fetchTenantAndApplyTheme = async (userId: string) => {
    try {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("*")
        .eq("owner_id", userId)
        .limit(1);

      if (tenants && tenants.length > 0) {
        const tenant = tenants[0];
        setCurrentTenant(tenant);
        
        // Apply theme based on tenant's theme_variant
        if (tenant.theme_variant) {
          applyTheme(tenant.theme_variant);
        }
      }
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user?.id) {
          fetchTenantAndApplyTheme(session.user.id);
        } else {
          setCurrentTenant(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchTenantAndApplyTheme(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, currentTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}