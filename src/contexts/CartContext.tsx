import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CartItem, MenuItem, SelectedVariationGroup, PizzaBorder } from "@/types/menu";
import { toast } from "@/components/ui/use-toast";
import { getAllVariations } from "@/services/variationService";
import { getAllMenuItems } from "@/services/menuItemService";
import { trackAddToCart, trackRemoveFromCart, trackUpdateCartQuantity } from "@/utils/trackingEvents";

interface ProdutoRef {
  // tipo: "produto" exige um produto específico; "categoria" exige qualquer item de uma categoria
  tipo?: "produto" | "categoria";
  product_id: string;
  product_name: string;
  // Quando tipo === "categoria", category_id/name identificam a categoria exigida
  category_id?: string;
  category_name?: string;
  quantidade: number;
}

interface AppliedCoupon {
  id: string;
  nome: string;
  tipo: "percentual" | "fixo" | "frete_gratis" | "compre_e_ganhe";
  valor: number;
  usos?: number | null;
  limite_uso?: number | null;
  data_inicio?: string;
  data_fim?: string;
  produtos_requeridos?: ProdutoRef[] | null;
  produto_brinde?: ProdutoRef | null;
}

// Marca itens adicionados como brinde via cupom
const BRINDE_FLAG = "__couponGiftId" as const;

interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: MenuItem & { selectedVariations?: SelectedVariationGroup[]; selectedBorder?: PizzaBorder; quantity?: number }) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  updateCartItemByIndex: (index: number, updatedItem: Partial<CartItem>) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  discountAmount: number;
  finalTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart_items_backup";

const saveCartToStorage = (items: CartItem[]) => {
  try {
    const minimal = items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      selectedVariations: item.selectedVariations,
      selectedBorder: item.selectedBorder ? { id: item.selectedBorder.id } : undefined,
      isHalfPizza: item.isHalfPizza,
      combination: item.combination,
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
  } catch (e) {
    console.error("Erro ao salvar carrinho no localStorage:", e);
  }
};

const loadCartFromStorage = (): any[] => {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const hasRestoredCart = useRef(false);

  // carregar variações
  useEffect(() => {
    const loadVariations = async () => {
      try {
        const allVariations = await getAllVariations();
        setVariations(allVariations);
      } catch (error) {
        console.error("Erro ao carregar variações:", error);
      }
    };
    loadVariations();
  }, []);

  // Restaurar carrinho do localStorage com preços atualizados
  useEffect(() => {
    if (hasRestoredCart.current) return;
    hasRestoredCart.current = true;

    const restoreCart = async () => {
      const savedItems = loadCartFromStorage();
      if (!savedItems.length) return;

      try {
        const allItems = await getAllMenuItems();
        const itemsMap = new Map(allItems.map(i => [i.id, i]));

        const restoredItems: CartItem[] = [];
        for (const saved of savedItems) {
          const fresh = itemsMap.get(saved.id);
          if (!fresh || fresh.available === false) continue;

          // Restaurar borda com preço atualizado
          let restoredBorder: PizzaBorder | undefined;
          if (saved.selectedBorder?.id && fresh.pizzaBorders) {
            restoredBorder = fresh.pizzaBorders.find((b: PizzaBorder) => b.id === saved.selectedBorder.id);
          }

          restoredItems.push({
            ...fresh,
            quantity: saved.quantity,
            selectedVariations: saved.selectedVariations,
            selectedBorder: restoredBorder,
            isHalfPizza: saved.isHalfPizza,
            combination: saved.combination,
          });
        }

        if (restoredItems.length > 0) {
          setCartItems(restoredItems);
        }
        if (restoredItems.length < savedItems.length) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
        }
      } catch (error) {
        console.error("Erro ao restaurar carrinho:", error);
      }
    };

    restoreCart();
  }, []);

  // Salvar carrinho no localStorage quando mudar
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  const getVariationPrice = (variationId: string): number => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.additionalPrice || 0;
  };

  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.name || "";
  };

  const calculateVariationsTotal = (item: CartItem): number => {
    let variationsTotal = 0;
    if (item.selectedVariations?.length) {
      item.selectedVariations.forEach(group => {
        group.variations?.forEach(variation => {
          const additionalPrice = variation.additionalPrice ?? getVariationPrice(variation.variationId);
          if (additionalPrice > 0) {
            // Se é pizza meio a meio e selecionou "whole" (pizza inteira), cobra 2x
            const multiplier = (item.isHalfPizza && variation.halfSelection === "whole") ? 2 : 1;
            variationsTotal += additionalPrice * (variation.quantity || 1) * multiplier;
          }
        });
      });
    }
    // Adicionar preço da borda selecionada
    if (item.selectedBorder?.additionalPrice) {
      variationsTotal += item.selectedBorder.additionalPrice;
    }
    return variationsTotal;
  };

  // Helper para identificar itens brinde
  const isGiftItem = (item: any): boolean => !!item?.[BRINDE_FLAG];

  // recalcular totais
  useEffect(() => {
    const { total, count } = cartItems.reduce(
      (acc, item) => {
        // Item brinde: nunca soma ao total
        if (isGiftItem(item)) {
          acc.count += item.quantity;
          return acc;
        }

        let itemTotal = 0;

        if (item.isHalfPizza) {
          const basePrice = item.price || 0;
          const variationsTotal = calculateVariationsTotal(item);
          itemTotal = (basePrice + variationsTotal) * item.quantity;
        } else {
          const basePrice = item.priceFrom ? 0 : (item.price || 0);
          const variationsTotal = calculateVariationsTotal(item);
          itemTotal = (basePrice + variationsTotal) * item.quantity;
        }

        acc.total += itemTotal;
        acc.count += item.quantity;
        return acc;
      },
      { total: 0, count: 0 }
    );

    setCartTotal(total);
    setItemCount(count);

    // Calcular desconto e total final
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.tipo === "percentual") {
        discount = total * (appliedCoupon.valor / 100);
      } else if (appliedCoupon.tipo === "fixo") {
        discount = appliedCoupon.valor;
      }
      // frete_gratis: handled in Checkout
      // compre_e_ganhe: brinde já está com preço 0, sem desconto monetário
    }
    setDiscountAmount(discount);
    setFinalTotal(Math.max(0, total - discount));
  }, [cartItems, variations, appliedCoupon]);

  // Verifica se o carrinho satisfaz os produtos exigidos por um cupom compre_e_ganhe
  // Suporta exigência por produto específico OU por categoria (soma quantidades)
  const cartSatisfiesRequirements = (
    items: CartItem[],
    requeridos: ProdutoRef[]
  ): boolean => {
    if (!requeridos?.length) return false;
    const elegiveis = items.filter((i) => !isGiftItem(i));
    return requeridos.every((req) => {
      const ehCategoria = req.tipo === "categoria";
      const totalNoCarrinho = elegiveis
        .filter((i) =>
          ehCategoria
            ? req.category_id && i.category === req.category_id
            : i.id === req.product_id
        )
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
      return totalNoCarrinho >= req.quantidade;
    });
  };

  // Calcula quantos "ciclos" completos da regra cabem no carrinho atual.
  // Ex.: regra "2 pizzas → 1 refri" + 5 pizzas = floor(5/2) = 2 ciclos.
  // Quando há múltiplos requisitos, usa o menor número de ciclos completos.
  const computeGiftMultiplier = (
    items: CartItem[],
    requeridos: ProdutoRef[]
  ): number => {
    if (!requeridos?.length) return 0;
    const elegiveis = items.filter((i) => !isGiftItem(i));
    let menorCiclo = Infinity;
    for (const req of requeridos) {
      if (!req.quantidade || req.quantidade <= 0) continue;
      const ehCategoria = req.tipo === "categoria";
      const totalNoCarrinho = elegiveis
        .filter((i) =>
          ehCategoria
            ? req.category_id && i.category === req.category_id
            : i.id === req.product_id
        )
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
      const ciclos = Math.floor(totalNoCarrinho / req.quantidade);
      if (ciclos < menorCiclo) menorCiclo = ciclos;
    }
    return Number.isFinite(menorCiclo) ? menorCiclo : 0;
  };

  // Constrói o item brinde com a quantidade já calculada de forma proporcional
  const buildGiftItem = (
    coupon: AppliedCoupon,
    items: CartItem[]
  ): CartItem | null => {
    if (!coupon.produto_brinde) return null;
    const ciclos = computeGiftMultiplier(items, coupon.produtos_requeridos || []);
    if (ciclos <= 0) return null;
    const brinde = coupon.produto_brinde;
    const totalBrindes = (brinde.quantidade || 1) * ciclos;
    return {
      id: `gift-${brinde.product_id}-${coupon.id}`,
      name: `🎁 ${brinde.product_name} (Brinde)`,
      description: `Brinde do cupom ${coupon.nome}`,
      price: 0,
      image: "/placeholder.svg",
      category: "brinde",
      quantity: totalBrindes,
      [BRINDE_FLAG]: brinde.product_id,
    } as any;
  };

  // Wrapper que gerencia adição/remoção do brinde
  const applyCouponInternal = (coupon: AppliedCoupon | null) => {
    setCartItems((prev) => {
      // Sempre remove brindes do cupom anterior
      const semBrindesAntigos = prev.filter((i) => !isGiftItem(i));

      if (!coupon || coupon.tipo !== "compre_e_ganhe" || !coupon.produto_brinde) {
        setAppliedCoupon(coupon);
        return semBrindesAntigos;
      }

      // Validar requisitos mínimos
      if (!cartSatisfiesRequirements(semBrindesAntigos, coupon.produtos_requeridos || [])) {
        toast({
          title: "Requisitos não atendidos",
          description: "Adicione os produtos exigidos para receber o brinde.",
          variant: "destructive",
        });
        return semBrindesAntigos;
      }

      const giftCartItem = buildGiftItem(coupon, semBrindesAntigos);
      setAppliedCoupon(coupon);
      return giftCartItem ? [...semBrindesAntigos, giftCartItem] : semBrindesAntigos;
    });
  };

  // Revalidar brinde quando o carrinho muda: ajusta quantidade proporcional automaticamente
  useEffect(() => {
    if (!appliedCoupon || appliedCoupon.tipo !== "compre_e_ganhe") return;
    const semBrindes = cartItems.filter((i) => !isGiftItem(i));
    const brindeAtual = cartItems.find((i) => isGiftItem(i));
    const satisfaz = cartSatisfiesRequirements(semBrindes, appliedCoupon.produtos_requeridos || []);

    if (!satisfaz) {
      if (brindeAtual) {
        setCartItems((prev) => prev.filter((i) => !isGiftItem(i)));
        toast({
          title: "Brinde removido",
          description: "Os produtos exigidos pelo cupom foram alterados.",
        });
      }
      return;
    }

    // Recalcular quantidade proporcional
    const novoBrinde = buildGiftItem(appliedCoupon, semBrindes);
    if (!novoBrinde) {
      if (brindeAtual) {
        setCartItems((prev) => prev.filter((i) => !isGiftItem(i)));
      }
      return;
    }

    if (!brindeAtual) {
      setCartItems((prev) => [...prev, novoBrinde]);
    } else if (brindeAtual.quantity !== novoBrinde.quantity) {
      setCartItems((prev) =>
        prev.map((i) => (isGiftItem(i) ? { ...i, quantity: novoBrinde.quantity } : i))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.filter((i) => !isGiftItem(i)).map((i) => `${i.id}:${i.quantity}`).join("|"), appliedCoupon?.id]);

  const enrichSelectedVariations = (selectedVariations?: SelectedVariationGroup[]): SelectedVariationGroup[] => {
    if (!selectedVariations?.length) return [];
    return selectedVariations.map(group => ({
      ...group,
      variations: group.variations.map(variation => ({
        ...variation,
        name: variation.name || getVariationName(variation.variationId),
        additionalPrice:
          variation.additionalPrice !== undefined
            ? variation.additionalPrice
            : getVariationPrice(variation.variationId),
      })),
    }));
  };

  const addItem = (menuItem: MenuItem & { selectedVariations?: SelectedVariationGroup[]; selectedBorder?: PizzaBorder; quantity?: number }) => {
    const { selectedVariations, selectedBorder, quantity: inputQuantity, ...item } = menuItem;
    const quantityToAdd = inputQuantity ?? 1;

    const enrichedVariations = enrichSelectedVariations(selectedVariations);
    const itemId = item.id;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        i =>
          i.id === itemId &&
          JSON.stringify(i.selectedVariations) === JSON.stringify(enrichedVariations) &&
          i.selectedBorder?.id === selectedBorder?.id
      );

      if (existingItem) {
        return prevItems.map(i =>
          i.id === itemId &&
          JSON.stringify(i.selectedVariations) === JSON.stringify(enrichedVariations) &&
          i.selectedBorder?.id === selectedBorder?.id
            ? { ...i, quantity: i.quantity + quantityToAdd }
            : i
        );
      } else {
        const newItem: CartItem = {
          ...item,
          quantity: quantityToAdd,
          selectedVariations: enrichedVariations,
          selectedBorder: selectedBorder,
        };
        return [...prevItems, newItem];
      }
    });

    toast({
      title: "Item adicionado",
      description: `${quantityToAdd}x ${item.name} foi adicionado ao carrinho`,
      duration: 2000,
    });
    
// --- INÍCIO DO CÓDIGO DE RASTREAMENTO (ATUALIZADO) ---
    try {
      const itemParaCalculo: CartItem = { ...menuItem, quantity: quantityToAdd, selectedVariations: enrichedVariations };
      let finalPrice = 0;

      if (itemParaCalculo.isHalfPizza) {
        finalPrice = itemParaCalculo.price || 0;
      } else {
        const basePrice = itemParaCalculo.priceFrom ? 0 : (itemParaCalculo.price || 0);
        const variationsTotal = calculateVariationsTotal(itemParaCalculo);
        finalPrice = basePrice + variationsTotal;
      }

      // Montando o objeto de dados completo para a nova função
      const trackingData = {
        id: item.id,
        name: item.name,
        price: finalPrice,
        quantity: quantityToAdd,
        category: item.category,
        variations: enrichedVariations?.flatMap(group => 
          group.variations.map(v => ({ name: v.name, price: v.additionalPrice }))
        ),
        border: menuItem.selectedBorder
          ? { name: menuItem.selectedBorder.name, price: menuItem.selectedBorder.additionalPrice }
          : undefined,
        isHalfPizza: item.isHalfPizza,
        combination: item.combination,
      };

      trackAddToCart(trackingData);

    } catch (error) {
        console.error("Falha ao rastrear evento AddToCart:", error);
    }
    // --- FIM DO CÓDIGO DE RASTREAMENTO ---

  };

  const addToCart = (item: MenuItem) => addItem(item);

  const removeFromCart = (id: string) => {
    const removedItem = cartItems.find(item => item.id === id);
    if (removedItem && isGiftItem(removedItem)) {
      toast({
        title: "Brinde",
        description: "Para remover o brinde, remova o cupom aplicado.",
        variant: "destructive",
      });
      return;
    }
    if (removedItem) {
      trackRemoveFromCart({
        id: removedItem.id,
        name: removedItem.name,
        price: removedItem.price,
        quantity: removedItem.quantity,
        category: removedItem.category,
      });
    }
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const buildTrackingData = (item: CartItem, newQuantity: number) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: newQuantity,
    category: item.category,
    variations: item.selectedVariations?.flatMap(group =>
      group.variations.map(v => ({ name: v.name, price: v.additionalPrice }))
    ),
    border: item.selectedBorder
      ? { name: item.selectedBorder.name, price: item.selectedBorder.additionalPrice }
      : undefined,
    isHalfPizza: item.isHalfPizza,
    combination: item.combination,
  });

  const increaseQuantity = (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (item && isGiftItem(item)) {
      toast({
        title: "Brinde",
        description: "A quantidade do brinde é calculada automaticamente.",
        variant: "destructive",
      });
      return;
    }
    if (item) {
      trackUpdateCartQuantity(buildTrackingData(item, item.quantity + 1));
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (item && isGiftItem(item)) {
      toast({
        title: "Brinde",
        description: "A quantidade do brinde é calculada automaticamente.",
        variant: "destructive",
      });
      return;
    }
    if (item && item.quantity > 1) {
      trackUpdateCartQuantity(buildTrackingData(item, item.quantity - 1));
    }
    setCartItems(prevItems => {
      const item = prevItems.find(i => i.id === id);
      if (!item) return prevItems;
      if (item.quantity <= 1) {
        return prevItems.filter(i => i.id !== id);
      }
      return prevItems.map(i =>
        i.id === id ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const updateCartItemByIndex = (index: number, updatedFields: Partial<CartItem>) => {
    setCartItems(prevItems =>
      prevItems.map((item, i) => {
        if (i !== index) return item;
        if (isGiftItem(item)) return item; // brindes não podem ser alterados
        // Ignorar tentativas de mudar a quantidade vinda de fora para itens normais via este método
        return { ...item, ...updatedFields };
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateCartItemByIndex,
        clearCart,
        cartTotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        appliedCoupon,
        setAppliedCoupon: applyCouponInternal,
        discountAmount,
        finalTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
