import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getAllMenuItems } from "@/services/menuItemService";
import { calcularSugestoes, getRegrasAtivas, SugestaoRegra } from "@/services/sugestoesService";
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

  const { titulo, itens } = useMemo(
    () => calcularSugestoes(regras, cartItems.filter((i: any) => !i?.__couponGiftId), menu),
    [regras, cartItems, menu],
  );

  if (!itens.length) return null;

  const handleAdd = (item: MenuItem) => {
    const precisaEscolher =
      item.hasVariations || (item.pizzaSizes?.length ?? 0) > 0 || item.tipo === "pizza" || item.priceFrom;
    if (precisaEscolher) {
      setIsCartOpen(false);
      navigate(`/cardapio?item=${item.id}`);
      return;
    }
    addToCart(item);
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm mb-2">{titulo}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
        {itens.map((item) => (
          <div key={item.id} className="snap-start shrink-0 w-32 rounded-lg border bg-card p-2 flex flex-col">
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.name}
              loading="lazy"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
              className="w-full aspect-square object-cover rounded-md bg-muted"
            />
            <p className="text-xs font-medium mt-2 line-clamp-2 min-h-[2rem]">{item.name}</p>
            <p className="text-xs font-bold text-brand mt-1">
              {item.priceFrom ? "a partir de " : ""}
              {formatCurrency(item.price)}
            </p>
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
