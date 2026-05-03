import React, { useState, useEffect } from "react";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { MenuItem, Variation, SelectedVariationGroup, PizzaBorder } from "@/types/menu";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import ProductVariationDialog from "./ProductVariationDialog";
import PizzaCombinationDialog from "./PizzaCombinationDialog";
import QuantityDialog from "./QuantityDialog";
import { getAllVariations } from "@/services/variationService";
import { trackViewContent } from "@/utils/trackingEvents";
import ProductDetailModal from "./ProductDetailModal";

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = React.forwardRef<{ triggerClick: () => void }, MenuItemCardProps>(({ item }, ref) => {
  const { addToCart, addItem } = useCart();
  const { settings } = useLayoutSettings();
  const isTwoColumns = settings.layout_colunas_mobile === '2';
  const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
  const [isPizzaDialogOpen, setIsPizzaDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [availableVariations, setAvailableVariations] = useState<Variation[]>([]);
  const [groups, setGroups] = useState<{ [groupId: string]: Variation[] }>({});
  const [loading, setLoading] = useState(false);
  const [tempCombinedItem, setTempCombinedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const loadVariations = async () => {
      try {
        setLoading(true);
        const variations = await getAllVariations();
        setAvailableVariations(variations);

        if (item.hasVariations && item.variationGroups && item.variationGroups.length > 0) {
          const groupVariations: { [groupId: string]: Variation[] } = {};

          for (const group of item.variationGroups) {
            // Respect the order defined in group.variations (admin-defined order)
            groupVariations[group.id] = group.variations
              .map(varId => variations.find(v => v.id === varId))
              .filter((variation): variation is Variation =>
                !!variation &&
                variation.available &&
                variation.categoryIds.includes(item.category)
              );
          }

          setGroups(groupVariations);
        }
      } catch (error) {
        console.error("Error loading variations:", error);
        setAvailableVariations([]);
      } finally {
        setLoading(false);
      }
    };

    loadVariations();
  }, [item]);

  const handleButtonClick = () => {
    // Track ViewContent on every product interaction
    trackViewContent({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      tipo: item.tipo,
      permiteCombinacao: item.permiteCombinacao,
    });

    if (item.hasVariations && item.variationGroups && item.variationGroups.length > 0) {
      setIsVariationDialogOpen(true);
    } else {
      setIsQuantityDialogOpen(true);
    }
  };

  React.useImperativeHandle(ref, () => ({
    triggerClick: handleButtonClick,
  }));

  const handleAddItemWithVariations = (
    itemWithQty: MenuItem & { quantity?: number },
    selectedVariationGroups: SelectedVariationGroup[],
    selectedBorder?: PizzaBorder | null
  ) => {
    addItem({
      ...itemWithQty,
      selectedVariations: selectedVariationGroups,
      selectedBorder: selectedBorder || undefined,
    });
    setTempCombinedItem(null);
  };
  const handleQuantityConfirm = (menuItem: MenuItem, quantity: number) => {
    addItem({ ...menuItem, quantity });
  };

  const handlePizzaCombination = (combinedItem: MenuItem) => {
    // Verifica se o item combinado tem variações
    if (combinedItem.hasVariations && combinedItem.variationGroups && combinedItem.variationGroups.length > 0) {
      // Armazena o item e abre o diálogo de variações
      setTempCombinedItem(combinedItem);
      setIsPizzaDialogOpen(false);
      setIsVariationDialogOpen(true);
    } else {
      // Adiciona direto ao carrinho
      addItem(combinedItem);
      setIsPizzaDialogOpen(false);
    }
  };

  return (
    <>
      <div className="food-item bg-white rounded-lg overflow-hidden shadow-md p-3 sm:p-4 flex flex-col" data-product-id={item.id}>
        <div
          className="aspect-[4/3] overflow-hidden rounded-md mb-3 cursor-pointer"
          onClick={() => {
            trackViewContent({
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category,
              tipo: item.tipo,
              permiteCombinacao: item.permiteCombinacao,
            });
            setIsDetailModalOpen(true);
          }}
        >
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            onError={(e) => {
              console.log("Erro ao carregar imagem:", item.image);
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-sm sm:text-lg font-bold mb-1 line-clamp-2">{item.name}</h3>
          <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-3">{item.description}</p>
        </div>
        <div className={`flex items-center mt-2 ${isTwoColumns ? 'flex-col gap-2' : 'justify-between flex-row'}`}>
          <div className="flex flex-col">
            {item.freteGratis && <span className="text-xs font-semibold text-green-600 mb-1">🚚 Frete Grátis</span>}
            {item.priceFrom && <span className="text-xs text-gray-500 mb-1">a partir de</span>}
            <span className={`font-bold text-brand ${isTwoColumns ? 'text-xs' : 'text-sm sm:text-lg'}`}>{formatCurrency(item.price)}</span>
          </div>
          <Button
            onClick={handleButtonClick}
            className={`add-to-cart-btn ${isTwoColumns ? '!text-xs !px-2 !py-1 !min-h-0 !h-7 w-full' : ''}`}
            size="sm"
            disabled={loading || (item.hasVariations && Object.keys(groups).length === 0)}
          >
            <PlusCircle className={`mr-1 ${isTwoColumns ? 'h-3 w-3' : 'h-4 w-4'}`} />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Fluxo pizza meio a meio */}
      {item.tipo === "pizza" && item.permiteCombinacao && (
        <PizzaCombinationDialog
          item={item}
          isOpen={isPizzaDialogOpen}
          onClose={() => setIsPizzaDialogOpen(false)}
          onAddToCart={handlePizzaCombination}
        />
      )}

      {/* Fluxo variações normais */}
      <ProductVariationDialog
        item={tempCombinedItem || item}
        isOpen={isVariationDialogOpen}
        onClose={() => {
          setIsVariationDialogOpen(false);
          setTempCombinedItem(null);
        }}
        onAddToCart={handleAddItemWithVariations}
        availableVariations={availableVariations}
        groupVariations={groups}
        onOpenPizzaCombination={() => setIsPizzaDialogOpen(true)}
      />
      <QuantityDialog
        item={item}
        isOpen={isQuantityDialogOpen}
        onClose={() => setIsQuantityDialogOpen(false)}
        onConfirm={handleQuantityConfirm}
        onOpenPizzaCombination={() => setIsPizzaDialogOpen(true)}
      />
      <ProductDetailModal
        item={item}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={() => {
          setIsDetailModalOpen(false);
          handleButtonClick();
          trackViewContent({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            tipo: item.tipo,
            permiteCombinacao: item.permiteCombinacao,
          });
          if (item.hasVariations && item.variationGroups && item.variationGroups.length > 0) {
            setIsVariationDialogOpen(true);
          } else {
            setIsQuantityDialogOpen(true);
          }	   
        }}
      />
    </>
  );
});

MenuItemCard.displayName = "MenuItemCard";

export default MenuItemCard;
