import React, { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

const CouponField: React.FC = () => {
  const { cartTotal, appliedCoupon, setAppliedCoupon } = useCart();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: "Código inválido", description: "Digite um código de cupom", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      const { data: cupom, error } = await supabase
        .from("cupons" as any)
        .select("*")
        .ilike("nome", couponCode.trim())
        .maybeSingle();

      if (error || !cupom) {
        toast({ title: "Cupom não encontrado", description: "Código de cupom inválido", variant: "destructive" });
        return;
      }
      const cupomData = cupom as any;

      if (!cupomData.ativo) {
        toast({ title: "Cupom inativo", description: "Este cupom não está mais disponível", variant: "destructive" });
        return;
      }

      const today = new Date();
      const dataInicio = new Date(cupomData.data_inicio);
      const dataFim = new Date(cupomData.data_fim);
      if (today < dataInicio || today > dataFim) {
        toast({ title: "Cupom expirado", description: "Este cupom não está mais válido", variant: "destructive" });
        return;
      }

      if (cupomData.valor_minimo_pedido && cartTotal < cupomData.valor_minimo_pedido) {
        toast({
          title: "Valor mínimo não atingido",
          description: `Pedido mínimo de ${formatCurrency(cupomData.valor_minimo_pedido)} para usar este cupom`,
          variant: "destructive",
        });
        return;
      }

      if (cupomData.limite_uso !== null && cupomData.limite_uso !== undefined) {
        const { count } = await supabase
          .from("cupons_usos" as any)
          .select("*", { count: "exact", head: true })
          .eq("cupom_id", cupomData.id);
        if ((count ?? 0) >= cupomData.limite_uso) {
          toast({ title: "Cupom esgotado", description: "Este cupom atingiu o limite de uso", variant: "destructive" });
          return;
        }
      }

      if (currentUser && cupomData.usos_por_usuario !== null && cupomData.usos_por_usuario !== undefined) {
        const { data: userData } = await supabase
          .from("users" as any)
          .select("id")
          .eq("firebase_id", currentUser.uid)
          .maybeSingle();
        const userDataTyped = userData as unknown as { id: string } | null;
        if (userDataTyped?.id) {
          const { count } = await supabase
            .from("cupons_usos" as any)
            .select("*", { count: "exact", head: true })
            .eq("cupom_id", cupomData.id)
            .eq("user_id", userDataTyped.id);
          if ((count ?? 0) >= cupomData.usos_por_usuario) {
            toast({
              title: "Limite de uso atingido",
              description: "Você já usou este cupom o máximo de vezes permitido",
              variant: "destructive",
            });
            return;
          }
        }
      }

      setAppliedCoupon({
        id: cupomData.id,
        nome: cupomData.nome,
        tipo: cupomData.tipo,
        valor: cupomData.valor,
        usos: cupomData.usos,
        limite_uso: cupomData.limite_uso,
        data_inicio: cupomData.data_inicio,
        data_fim: cupomData.data_fim,
        produtos_requeridos: cupomData.produtos_requeridos ?? null,
        produto_brinde: cupomData.produto_brinde ?? null,
      });

      const descricaoDesconto =
        cupomData.tipo === "percentual"
          ? `${cupomData.valor}%`
          : cupomData.tipo === "frete_gratis"
          ? "Frete Grátis"
          : cupomData.tipo === "compre_e_ganhe"
          ? `🎁 Brinde: ${cupomData.produto_brinde?.product_name || "produto"}`
          : formatCurrency(cupomData.valor);

      toast({ title: "Cupom aplicado!", description: `Cupom aplicado: ${descricaoDesconto}` });
      setCouponCode("");
    } catch (err) {
      console.error("Erro ao aplicar cupom:", err);
      toast({ title: "Erro", description: "Não foi possível aplicar o cupom", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast({ title: "Cupom removido", description: "O desconto foi removido do seu pedido" });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Código do cupom"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          disabled={couponLoading || !!appliedCoupon}
        />
        {appliedCoupon ? (
          <Button variant="outline" onClick={handleRemoveCoupon} className="shrink-0">
            Remover
          </Button>
        ) : (
          <Button onClick={handleApplyCoupon} disabled={couponLoading} className="shrink-0">
            <Tag className="h-4 w-4 mr-1" />
            Aplicar
          </Button>
        )}
      </div>

      {appliedCoupon && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
          <div className="flex items-center gap-2 text-green-700">
            <Tag className="h-4 w-4" />
            <span className="font-medium">{appliedCoupon.nome}</span>
          </div>
          <p className="text-green-600 text-xs mt-1">
            {appliedCoupon.tipo === "frete_gratis"
              ? "🚚 Frete Grátis"
              : appliedCoupon.tipo === "compre_e_ganhe"
              ? `🎁 Brinde: ${appliedCoupon.produto_brinde?.quantidade || 1}x ${appliedCoupon.produto_brinde?.product_name || ""}`
              : `Desconto de ${appliedCoupon.tipo === "percentual" ? `${appliedCoupon.valor}%` : formatCurrency(appliedCoupon.valor)}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default CouponField;
