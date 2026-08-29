import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { consumeGoogleNonce, parseGoogleIdTokenFromHash, startGoogleIdTokenSignIn } from "@/lib/googleIdentity";

const authRedirectTo = () => `${window.location.origin}/auth`;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, inviteCode?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const idToken = parseGoogleIdTokenFromHash();
    if (idToken) {
      const nonce = consumeGoogleNonce();
      void supabase.auth
        .signInWithIdToken({
          provider: "google",
          token: idToken,
          ...(nonce ? { nonce } : {}),
        })
        .then(async ({ error }) => {
          if (error && nonce) {
            const retry = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: idToken,
            });
            if (retry.error) setLoading(false);
          } else if (error) {
            setLoading(false);
          }
          window.history.replaceState({}, document.title, `${window.location.origin}/auth`);
        });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, inviteCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectTo(),
        data: {
          display_name: displayName,
          ...(inviteCode ? { invite_code: inviteCode } : {}),
        },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    await startGoogleIdTokenSignIn();
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
