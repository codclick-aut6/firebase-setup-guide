import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getAllMenuItems } from "@/services/menuItemService";
import { aplicarDesconto, calcularSugestoes, UPSELL_FLAG, getRegrasAtivas, SugestaoRegra } from "@/services/sugestoesService";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";

const CartSuggestions: React.FC = () => {
  const { cartItems, addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [regras, setRegras] = useState<SugestaoRegra[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  useEffect(() => {
    getRegrasAtivas().then(setRegras).catch(() => setRegras([]));
    getAllMenuItems().then(setMenu).catch(() => setMenu([]));
  }, []);

  const { titulo, itens, descontos } = useMemo(
    () => calcularSugestoes(regras, cartItems.filter((i: any) => !i?.__couponGiftId), menu),
    [regras, cartItems, menu],
  );

  if (!itens.length) return null;

  const handleAdd = (item: MenuItem) => {
    const precisaEscolher =
      item.hasVariations || (item.pizzaSizes?.length ?? 0) > 0 || item.tipo === "pizza" || item.priceFrom;
    const desconto = descontos[item.id] ?? 0;
    if (precisaEscolher) {
      try { sessionStorage.setItem(UPSELL_FLAG, JSON.stringify({ id: item.id, desconto })); } catch { /* ignore */ }
      setIsCartOpen(false);
      navigate(`/cardapio?item=${item.id}`);
      return;
    }
    addToCart(desconto > 0 ? ({ ...item, price: aplicarDesconto(item.price, desconto), upsellDiscount: desconto } as any) : item);
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm mb-2">{titulo}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
        {itens.map((item) => (
          <div key={item.id} className="relative snap-start shrink-0 w-32 rounded-lg border bg-card p-2 flex flex-col">
            {(descontos[item.id] ?? 0) > 0 && (
              <span className="absolute top-3 left-3 z-10 rounded bg-food-green text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                -{formatCurrency(descontos[item.id])}
              </span>
            )}
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.name}
              loading="lazy"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
              className="w-full aspect-square object-cover rounded-md bg-muted"
            />
            <p className="text-xs font-medium mt-2 line-clamp-2 min-h-[2rem]">{item.name}</p>
            {(descontos[item.id] ?? 0) > 0 ? (
              <div className="mt-1 leading-tight">
                <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(item.price)}</p>
                <p className="text-xs font-bold text-food-green">
                  {item.priceFrom ? "a partir de " : ""}
                  {formatCurrency(aplicarDesconto(item.price, descontos[item.id]))}
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-brand mt-1">
                {item.priceFrom ? "a partir de " : ""}
                {formatCurrency(item.price)}
              </p>
            )}
            <button
              type="button"
              onClick={() => handleAdd(item)}
              className="mt-2 flex items-center justify-center gap-1 rounded-md bg-brand hover:bg-brand-600 text-primary-foreground text-xs font-semibold py-1.5"
            >
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CartSuggestions;
