
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem, Variation, SelectedVariation, SelectedVariationGroup, VariationGroup, HalfSelection, PizzaBorder } from "@/types/menu";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, Circle, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ProductVariationDialogProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem & { quantity?: number }, selectedVariationGroups: SelectedVariationGroup[], selectedBorder?: PizzaBorder | null) => void;
  availableVariations: Variation[];
  groupVariations: {[groupId: string]: Variation[]};
  onOpenPizzaCombination?: () => void;
  initialSelections?: SelectedVariationGroup[];
  initialBorder?: PizzaBorder | null;
  confirmLabel?: string;
}

// Tipo interno para gerenciar seleções com metade
interface VariationSelection {
  variationId: string;
  quantity: number;
  name?: string;
  additionalPrice?: number;
  halfSelection?: HalfSelection;
}

const ProductVariationDialog: React.FC<ProductVariationDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  availableVariations,
  groupVariations,
  onOpenPizzaCombination,
  initialSelections,
  initialBorder,
  confirmLabel,
}) => {
  const [selectedVariationGroups, setSelectedVariationGroups] = useState<SelectedVariationGroup[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);
  // Estado para controlar qual variação está tendo a metade selecionada
  const [selectingHalfFor, setSelectingHalfFor] = useState<{groupId: string, variationId: string} | null>(null);
  // Estado para borda selecionada
  const [selectedBorder, setSelectedBorder] = useState<PizzaBorder | null>(null);
  // Quantidade do item
  const [itemQuantity, setItemQuantity] = useState(1);

  const isHalfPizza = item.isHalfPizza === true;
  const hasBorders = item.tipo === "pizza" && item.pizzaBorders && item.pizzaBorders.length > 0;

  useEffect(() => {
    if (isOpen && item.variationGroups) {
      // If we have initial selections (edit mode), use them
      if (initialSelections && initialSelections.length > 0) {
        // Merge initial selections with all available variations (to show unselected ones too)
        const mergedGroups = item.variationGroups.map(group => {
          if (!group) return null;
          const groupVars = groupVariations[group.id] || [];
          const existingGroup = initialSelections.find(sg => sg.groupId === group.id);
          
          const variations = groupVars.map(variation => {
            const existingVar = existingGroup?.variations.find(v => v.variationId === variation.id);
            return {
              variationId: variation.id,
              quantity: existingVar?.quantity || 0,
              name: variation.name,
              additionalPrice: variation.additionalPrice || 0,
              halfSelection: existingVar?.halfSelection,
            };
          });

          return {
            groupId: group.id,
            groupName: group.name,
            variations,
          };
        }).filter(Boolean) as SelectedVariationGroup[];

        setSelectedVariationGroups(mergedGroups);
        setSelectedBorder(initialBorder ?? null);
      } else {
        // Initialize selected variations for each group
        const initialGroups = item.variationGroups.map(group => {
          if (!group) return null;
          
          const groupVars = groupVariations[group.id] || [];
          const variations = groupVars.map(variation => ({
            variationId: variation.id,
            quantity: 0,
            name: variation.name,
            additionalPrice: variation.additionalPrice || 0,
            halfSelection: undefined as HalfSelection | undefined
          }));

          return {
            groupId: group.id,
            groupName: group.name,
            variations: variations
          };
        }).filter(Boolean) as SelectedVariationGroup[];

        setSelectedVariationGroups(initialGroups);
        setSelectedBorder(null);
      }
      setSelectingHalfFor(null);
      setItemQuantity(1);
    }
  }, [isOpen, item.variationGroups, groupVariations]);

  // Validate selections whenever they change
  useEffect(() => {
    if (!item.variationGroups || selectedVariationGroups.length === 0) {
      setIsValid(false);
      return;
    }

    // Check if all required groups have the correct number of selections
    const allGroupsValid = item.variationGroups.every(group => {
      if (!group) return false;
      
      const selectedGroup = selectedVariationGroups.find(sg => sg.groupId === group.id);
      if (!selectedGroup) return false;

      const totalSelected = selectedGroup.variations.reduce((sum, v) => sum + v.quantity, 0);
      return totalSelected >= group.minRequired && totalSelected <= group.maxAllowed;
    });

    setIsValid(allGroupsValid);
  }, [selectedVariationGroups, item.variationGroups]);

  const getGroupDef = (groupId: string): VariationGroup | undefined => {
    return item.variationGroups?.find(g => g?.id === groupId);
  };

  const increaseVariation = (groupId: string, variationId: string, halfSelection?: HalfSelection) => {
    const groupDef = getGroupDef(groupId);
    if (!groupDef) return;

    // Se é pizza meio a meio e o grupo permite seleção por metade, mostrar opções
    if (isHalfPizza && groupDef.allowPerHalf && !halfSelection) {
      setSelectingHalfFor({ groupId, variationId });
      return;
    }

    setSelectedVariationGroups(prev => 
      prev.map(group => {
        if (group.groupId !== groupId) return group;

        // Count current total quantity for this group
        const currentTotal = group.variations.reduce((sum, v) => sum + v.quantity, 0);
        
        // Don't allow increasing if we're already at max total quantity
        if (currentTotal >= groupDef.maxAllowed) return group;
        
        // Update the specific variation
        return {
          ...group,
          variations: group.variations.map(variation => {
            if (variation.variationId === variationId) {
              const variationDetails = getVariationDetails(variationId);
              return { 
                ...variation, 
                quantity: variation.quantity + 1,
                name: variationDetails?.name || variation.name,
                additionalPrice: variationDetails?.additionalPrice || variation.additionalPrice || 0,
                halfSelection: halfSelection || (isHalfPizza ? undefined : "whole" as HalfSelection)
              };
            }
            return variation;
          })
        };
      })
    );

    setSelectingHalfFor(null);
  };

  const handleHalfSelection = (halfSelection: HalfSelection) => {
    if (!selectingHalfFor) return;
    increaseVariation(selectingHalfFor.groupId, selectingHalfFor.variationId, halfSelection);
  };

  const decreaseVariation = (groupId: string, variationId: string) => {
    setSelectedVariationGroups(prev => 
      prev.map(group => {
        if (group.groupId !== groupId) return group;
        
        return {
          ...group,
          variations: group.variations.map(variation => 
            variation.variationId === variationId && variation.quantity > 0
              ? { ...variation, quantity: variation.quantity - 1, halfSelection: variation.quantity === 1 ? undefined : variation.halfSelection } 
              : variation
          )
        };
      })
    );
  };

  const handleAddToCart = () => {
    if (!isValid) return;
    
    // Filter out variations with quantity 0 and ensure all data is included
    const nonZeroGroups = selectedVariationGroups.map(group => ({
      ...group,
      variations: group.variations.filter(v => v.quantity > 0).map(v => {
        const variationDetails = getVariationDetails(v.variationId);
        return {
          ...v,
          name: variationDetails?.name || v.name,
          additionalPrice: variationDetails?.additionalPrice || v.additionalPrice || 0
        };
      })
    })).filter(group => group.variations.length > 0);
    
    console.log("Enviando variações para o carrinho:", nonZeroGroups);
    console.log("Borda selecionada:", selectedBorder);
    
    onAddToCart({ ...item, quantity: itemQuantity }, nonZeroGroups, selectedBorder);
    onClose();
  };

  const getVariationDetails = (variationId: string) => {
    return availableVariations.find(v => v.id === variationId);
  };

  const getGroupSelectionStatus = (groupId: string) => {
    const groupDef = getGroupDef(groupId);
    if (!groupDef) return { total: 0, min: 0, max: 0, isValid: false };

    const selectedGroup = selectedVariationGroups.find(sg => sg.groupId === groupId);
    if (!selectedGroup) return { total: 0, min: groupDef.minRequired, max: groupDef.maxAllowed, isValid: false };

    const totalSelected = selectedGroup.variations.reduce((sum, v) => sum + v.quantity, 0);
    const isValid = totalSelected >= groupDef.minRequired && totalSelected <= groupDef.maxAllowed;

    return {
      total: totalSelected,
      min: groupDef.minRequired,
      max: groupDef.maxAllowed,
      isValid
    };
  };

  const getVariationGroupMessage = (groupId: string) => {
    const groupDef = getGroupDef(groupId);
    if (!groupDef) return "";

    const { total, min, max } = getGroupSelectionStatus(groupId);

    if (groupDef.customMessage) {
      let message = groupDef.customMessage;
      message = message.replace('{min}', min.toString());
      message = message.replace('{max}', max.toString());
      message = message.replace('{count}', total.toString());
      return message;
    }

    if (min === max) {
      return `Selecione exatamente ${min} unidades de ${groupDef.name.toLowerCase()} (${total}/${min} selecionadas)`;
    } else if (min > 0) {
      return `Selecione de ${min} a ${max} unidades de ${groupDef.name.toLowerCase()} (${total}/${max} selecionadas)`;
    } else {
      return `Selecione até ${max} unidades de ${groupDef.name.toLowerCase()} (opcional) (${total}/${max} selecionadas)`;
    }
  };

  const getHalfSelectionLabel = (halfSelection?: HalfSelection): string => {
    if (!halfSelection) return "";
    switch (halfSelection) {
      case "half1": return "Metade 1";
      case "half2": return "Metade 2";
      case "whole": return "Pizza Inteira";
      default: return "";
    }
  };

  const calculateVariationPrice = (variation: SelectedVariation, groupDef: VariationGroup): number => {
    const basePrice = variation.additionalPrice || 0;
    
    // Se é pizza meio a meio e o grupo permite seleção por metade
    if (isHalfPizza && groupDef.allowPerHalf) {
      // Uma metade = 1x preço, ambas metades / pizza inteira = 2x não se aplica aqui
      // O preço é sempre 1x por seleção, mas mostramos para o usuário
      return basePrice;
    }
    
    return basePrice;
  };

  if (!item.variationGroups || item.variationGroups.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="px-6 py-4 flex-shrink-0 border-b">
            <DialogTitle className="text-left">{item.name}</DialogTitle>
            <DialogDescription className="text-left">{item.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="h-48 w-full overflow-hidden rounded-md mb-4">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            
            {/* Opção Pizza Meio a Meio - logo após a foto */}
            {item.tipo === "pizza" && item.permiteCombinacao && onOpenPizzaCombination && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Quer fazer uma Pizza Meio a Meio?</h4>
                <p className="text-sm text-orange-700 mb-3">
                  Combine dois sabores diferentes em uma pizza!
                </p>
                <Button 
                  onClick={() => {
                    onClose();
                    onOpenPizzaCombination();
                  }}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Escolher Pizza Meio a Meio
                </Button>
              </div>
            )}

            {/* Indicador de Pizza Meio a Meio */}
            {isHalfPizza && item.combination && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  🍕 Pizza Meio a Meio
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Metade 1: {item.combination.sabor1.name} | Metade 2: {item.combination.sabor2.name}
                </p>
              </div>
            )}
            
            {(() => {
              // Build ordered sections: variation groups + borders
              type Section = { type: "group"; group: VariationGroup; groupIndex: number } | { type: "borders" };
              const groups: Section[] = (item.variationGroups || []).map((group, idx) => ({
                type: "group" as const,
                group,
                groupIndex: idx,
              }));

              const sections: Section[] = [];
              if (hasBorders) {
                const bordersPos = item.bordersPosition ?? groups.length;
                const clampedPos = Math.max(0, Math.min(bordersPos, groups.length));
                let inserted = false;
                for (let i = 0; i <= groups.length; i++) {
                  if (i === clampedPos && !inserted) {
                    sections.push({ type: "borders" });
                    inserted = true;
                  }
                  if (i < groups.length) sections.push(groups[i]);
                }
                if (!inserted) sections.push({ type: "borders" });
              } else {
                sections.push(...groups);
              }

              let sectionCounter = 0;
              return sections.map((section, sIdx) => {
                if (section.type === "borders") {
                  return (
                    <div key="borders-section" className="mb-6">
                      {sIdx > 0 && <Separator className="my-6" />}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">Escolha a Borda</h3>
                        <span className="text-sm px-2 py-1 rounded bg-muted text-muted-foreground">
                          Opcional
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecione uma borda recheada para sua pizza
                      </p>
                      
                      <div className="space-y-2">
                        <div 
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedBorder === null 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedBorder(null)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedBorder === null ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedBorder === null && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="font-medium">Sem borda recheada</span>
                          </div>
                          <span className="text-sm text-muted-foreground">Grátis</span>
                        </div>
                        
                        {item.pizzaBorders?.filter(b => b.available !== false).map(border => (
                          <div 
                            key={border.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedBorder?.id === border.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedBorder(border)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedBorder?.id === border.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                              }`}>
                                {selectedBorder?.id === border.id && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div>
                                <span className="font-medium">{border.name}</span>
                                {border.description && (
                                  <p className="text-xs text-muted-foreground">{border.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-green-600">
                              {border.additionalPrice > 0 ? `+${formatCurrency(border.additionalPrice)}` : 'Grátis'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                const { group, groupIndex } = section;
                if (!group) return null;
                const groupStatus = getGroupSelectionStatus(group.id);
                const showHalfOption = isHalfPizza && group.allowPerHalf;
                const currentSectionIndex = sIdx;
                
                return (
                  <div key={group.id} className="mb-6">
                    {currentSectionIndex > 0 && <Separator className="my-6" />}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        {showHalfOption && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            Por metade
                          </span>
                        )}
                      </div>
                      <span className={`text-sm px-2 py-1 rounded ${
                        groupStatus.isValid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {groupStatus.total} / {groupStatus.max} unidades
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                      {getVariationGroupMessage(group.id)}
                    </p>

                    {showHalfOption && (
                      <p className="text-xs text-orange-600 mb-3 flex items-center gap-1">
                        <Circle className="h-3 w-3" />
                        Você pode escolher adicionar em cada metade ou na pizza inteira
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      {selectedVariationGroups
                        .find(sg => sg.groupId === group.id)?.variations
                        .map(variation => {
                          const variationDetails = getVariationDetails(variation.variationId);
                          if (!variationDetails) return null;
                          const price = calculateVariationPrice(variation, group);
                          
                          return (
                            <div key={variation.variationId} className="py-3 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{variationDetails.name}</p>
                                  {price > 0 && (
                                    <p className="text-sm text-gray-500">
                                      +{formatCurrency(price)}
                                      {showHalfOption && variation.quantity > 0 && variation.halfSelection && (
                                        <span className="ml-2 text-orange-600">
                                          ({getHalfSelectionLabel(variation.halfSelection)})
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {!price && variation.quantity > 0 && showHalfOption && variation.halfSelection && (
                                    <p className="text-sm text-orange-600">
                                      {getHalfSelectionLabel(variation.halfSelection)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-3 flex-shrink-0">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 w-9 p-0 touch-action-manipulation" 
                                    onClick={() => decreaseVariation(group.id, variation.variationId)}
                                    disabled={variation.quantity <= 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  
                                  <span className="w-8 text-center font-medium">{variation.quantity}</span>
                                  
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 w-9 p-0 touch-action-manipulation" 
                                    onClick={() => increaseVariation(group.id, variation.variationId)}
                                    disabled={groupStatus.total >= groupStatus.max}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Modal de seleção de metade */}
                              {selectingHalfFor?.groupId === group.id && 
                               selectingHalfFor?.variationId === variation.variationId && (
                                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200 animate-in fade-in slide-in-from-top-2">
                                  <p className="text-sm font-medium text-orange-800 mb-3">
                                    Onde deseja adicionar "{variationDetails.name}"?
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex flex-col h-auto py-2 border-orange-300 hover:bg-orange-100"
                                      onClick={() => handleHalfSelection("half1")}
                                    >
                                      <span className="text-xs font-medium">Metade 1</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {item.combination?.sabor1.name?.substring(0, 10)}...
                                      </span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex flex-col h-auto py-2 border-orange-300 hover:bg-orange-100"
                                      onClick={() => handleHalfSelection("half2")}
                                    >
                                      <span className="text-xs font-medium">Metade 2</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {item.combination?.sabor2.name?.substring(0, 10)}...
                                      </span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex flex-col h-auto py-2 border-orange-300 hover:bg-orange-100"
                                      onClick={() => handleHalfSelection("whole")}
                                    >
                                      <span className="text-xs font-medium">Inteira</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        2x preço
                                      </span>
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-2 text-xs"
                                    onClick={() => setSelectingHalfFor(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              });
            })()}
            
            {/* Espaço extra no final para garantir acesso aos botões */}
            <div className="h-20"></div>
          </div>
          
          <div className="p-6 border-t flex-shrink-0 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Quantidade de itens</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setItemQuantity(q => Math.max(1, q - 1))}
                  disabled={itemQuantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold text-lg">{itemQuantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setItemQuantity(q => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleAddToCart} 
                disabled={!isValid}
                className="bg-food-green hover:bg-opacity-90 flex-1"
              >
                {confirmLabel || `Adicionar ${itemQuantity}x ao carrinho`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductVariationDialog;
