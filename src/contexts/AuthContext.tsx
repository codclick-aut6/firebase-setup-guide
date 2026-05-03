import React, { createContext } from "react";
import { User, UserCredential } from "firebase/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { signUp as authSignUp, signIn as authSignIn, logOut as authLogOut } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuthState();
  const { toast } = useToast();

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    try {
      const result = await authSignUp(email, password, name, phone);
      toast({
        title: "Conta criada com sucesso",
        description: "Bem-vindo ao nosso aplicativo!",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authSignIn(email, password);
      toast({
        title: "Login realizado",
        description: "Você entrou com sucesso.",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await authLogOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    logOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
