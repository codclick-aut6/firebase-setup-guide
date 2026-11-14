import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { trackCheckoutLoginCompleted } from "@/utils/trackingEvents";
import EmailDomainShortcuts from "@/components/auth/EmailDomainShortcuts";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setNotFound(false);
      setLoading(true);
      const result = await signIn(email, password);
      const user = result.data.user;

      // Consulta role na tabela user_roles do Supabase
      let role: string = "user";
      if (user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("role", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (roleRow?.role) role = roleRow.role;
      }

      trackCheckoutLoginCompleted(cartItems, cartItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0));

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo!`,
      });

      if (redirectTo) {
        navigate(redirectTo);
      } else if (role === "admin" || role === "super-admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      let exists = true;
      try {
        const { data } = await supabase
          .from("users")
          .select("id")
          .ilike("email", email.trim())
          .limit(1);
        exists = !!(data && data.length > 0);
      } catch {}
      if (!exists) {
        setNotFound(true);
      } else {
        setError("Senha incorreta. Confira e tente novamente, ou toque em \"Esqueceu sua senha?\".");
      }
    } finally {
      setLoading(false);
    }
  };

const [showPassword, setShowPassword] = useState(false); // 👈 estado para exibir ou não a senha

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="rounded-xl border-2 border-primary bg-primary/10 p-5 text-center space-y-3">
          <h2 className="text-2xl font-extrabold text-foreground">Primeira vez pedindo por aqui?</h2>
          <p className="text-base text-muted-foreground">Leva menos de 1 minuto para fazer seu cadastro e pedir</p>
          <Button asChild size="lg" className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white">
            <Link to={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}>Criar meu cadastro agora</Link>
          </Button>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou entre se já tiver cadastro</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {notFound && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3 text-center">
            <p className="text-base font-semibold text-gray-900">Não encontramos cadastro com este e-mail. É sua primeira vez aqui?</p>
            <Button
              type="button"
              size="lg"
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate(redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register", { state: { email, password } })}
            >
              Criar conta com este e-mail
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <EmailDomainShortcuts value={email} onChange={setEmail} />
            </div>

<div>
  <label
    htmlFor="password"
    className="block text-sm font-medium text-gray-700"
  >
    Senha
  </label>
  <div className="mt-1 relative">
    <Lock className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
    <Input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"} // 👈 alterna tipo
      autoComplete="current-password"
      required
      className="pl-10 pr-12" // 👈 espaço extra à direita para o botão
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="••••••••"
    />
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-foreground hover:bg-muted"
      aria-label="Mostrar ou ocultar senha"
      onClick={() => setShowPassword(!showPassword)}
    >
      {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
    </button>
  </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-brand hover:text-brand-600"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand hover:bg-brand-600"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
