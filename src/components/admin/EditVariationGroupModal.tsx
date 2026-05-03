
import React from "react";
import { VariationGroup, Variation } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle, ChevronUp, ChevronDown } from "lucide-react";
import { saveVariationGroup } from "@/services/variationGroupService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditVariationGroupModalProps {
  editVariationGroup: VariationGroup;
  setEditVariationGroup: (group: VariationGroup | null) => void;
  variations: Variation[];
  variationGroups: VariationGroup[];
  onSuccess: () => void;
}

export const EditVariationGroupModal = ({
  editVariationGroup,
  setEditVariationGroup,
  variations,
  variationGroups,
  onSuccess,
}: EditVariationGroupModalProps) => {
  const { toast } = useToast();

  const handleVariationCheckboxChange = (variationId: string) => {
    const currentVariations = editVariationGroup.variations || [];
    const updatedVariations = currentVariations.includes(variationId)
      ? currentVariations.filter(id => id !== variationId)
      : [...currentVariations, variationId];
    
    setEditVariationGroup({
      ...editVariationGroup,
      variations: updatedVariations
    });
  };

  const moveSelectedVariation = (variationId: string, direction: "up" | "down") => {
    const current = [...(editVariationGroup.variations || [])];
    const idx = current.indexOf(variationId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= current.length) return;
    [current[idx], current[newIdx]] = [current[newIdx], current[idx]];
    setEditVariationGroup({ ...editVariationGroup, variations: current });
  };

  const handleSaveVariationGroup = async () => {
    if (!editVariationGroup.name) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do grupo de variação é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!editVariationGroup.variations || editVariationGroup.variations.length === 0) {
      toast({
        title: "Variações obrigatórias",
        description: "Selecione pelo menos uma variação para o grupo",
        variant: "destructive",
      });
      return;
    }

    if (editVariationGroup.minRequired > editVariationGroup.maxAllowed) {
      toast({
        title: "Valores inválidos",
        description: "O mínimo obrigatório não pode ser maior que o máximo permitido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if we're creating a new group or updating an existing one
      const isNew = !editVariationGroup.id || !variationGroups.some(g => g.id === editVariationGroup.id);
      
      const savedId = await saveVariationGroup(editVariationGroup);
      
      // Sincronizar os itens de menu com as novas variações
      const { syncMenuItemsWithVariationGroup } = await import("@/services/variationGroupService");
      await syncMenuItemsWithVariationGroup(savedId, editVariationGroup.variations);

      setEditVariationGroup(null);
      toast({
        title: "Sucesso",
        description: isNew
          ? "Grupo de variação criado e itens sincronizados com sucesso"
          : "Grupo de variação atualizado e itens sincronizados com sucesso",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar grupo de variação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o grupo de variação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isNew = !editVariationGroup.id || !variationGroups.some(g => g.id === editVariationGroup.id);

  return (
    <Dialog open={!!editVariationGroup} onOpenChange={(open) => !open && setEditVariationGroup(null)}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0">
        <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0 border-b">
          <h2 className="text-xl font-bold">
            {isNew ? "Novo Grupo de Variações" : "Editar Grupo de Variações"}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditVariationGroup(null)}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            <div>
              <Label htmlFor="group-name">Nome do Grupo</Label>
              <Input
                id="group-name"
                value={editVariationGroup.name}
                onChange={(e) => setEditVariationGroup({...editVariationGroup, name: e.target.value})}
                placeholder="Ex: Sabores, Recheios, Complementos"
              />
            </div>

<div>
  <Label htmlFor="internal-name">Nome Interno</Label>
  <Input
    id="internal-name"
    value={editVariationGroup.internalName || ""}
    onChange={(e) =>
      setEditVariationGroup({
        ...editVariationGroup,
        internalName: e.target.value,
      })
    }
    placeholder="Ex: pizza_sabores, adicionais_doces"
  />
  <p className="text-xs text-gray-500 mt-1">
    Esse nome é usado apenas internamente no painel administrativo
  </p>
</div>

            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-required">Mínimo Obrigatório</Label>
                <Input
                  id="min-required"
                  type="number"
                  min="0"
                  value={editVariationGroup.minRequired}
                  onChange={(e) => setEditVariationGroup({
                    ...editVariationGroup, 
                    minRequired: parseInt(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label htmlFor="max-allowed">Máximo Permitido</Label>
                <Input
                  id="max-allowed"
                  type="number"
                  min="1"
                  value={editVariationGroup.maxAllowed}
                  onChange={(e) => setEditVariationGroup({
                    ...editVariationGroup, 
                    maxAllowed: parseInt(e.target.value)
                  })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="custom-message">Mensagem Personalizada (opcional)</Label>
              <Input
                id="custom-message"
                value={editVariationGroup.customMessage || ""}
                onChange={(e) => setEditVariationGroup({
                  ...editVariationGroup, 
                  customMessage: e.target.value
                })}
                placeholder="Ex: Escolha {min} opções"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{min}"} para o número mínimo, {"{max}"} para o máximo e {"{count}"} para quantidade selecionada
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Variações Disponíveis</Label>
              <p className="text-xs text-gray-500">
                Use as setas ↑↓ para definir a ordem em que as variações selecionadas serão exibidas ao cliente.
              </p>
              <div className="max-h-72 overflow-y-auto border rounded-md p-2">
                {(() => {
                  const selectedIds = editVariationGroup.variations || [];
                  const selectedVariations = selectedIds
                    .map(id => variations.find(v => v.id === id))
                    .filter((v): v is Variation => !!v);
                  const unselectedVariations = variations
                    .filter(v => !selectedIds.includes(v.id))
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: 'base' }));

                  return (
                    <>
                      {selectedVariations.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide px-1 py-1">
                            Selecionadas (ordem de exibição)
                          </p>
                          {selectedVariations.map((variation, idx) => (
                            <div key={variation.id} className="flex items-center gap-1 py-1 bg-blue-50/40 rounded px-1">
                              <div className="flex flex-col">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => moveSelectedVariation(variation.id, "up")}
                                  disabled={idx === 0}
                                  title="Mover para cima"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => moveSelectedVariation(variation.id, "down")}
                                  disabled={idx === selectedVariations.length - 1}
                                  title="Mover para baixo"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-xs text-gray-400 w-5">#{idx + 1}</span>
                              <Checkbox
                                id={`var-${variation.id}`}
                                checked
                                onCheckedChange={() => handleVariationCheckboxChange(variation.id)}
                              />
                              <Label htmlFor={`var-${variation.id}`} className="cursor-pointer">
                                {variation.name}
                                {variation.additionalPrice > 0 && ` (+R$ ${variation.additionalPrice.toFixed(2)})`}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {unselectedVariations.length > 0 && (
                        <div>
                          {selectedVariations.length > 0 && (
                            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide px-1 py-1 border-t mt-1 pt-2">
                              Disponíveis
                            </p>
                          )}
                          {unselectedVariations.map((variation) => (
                            <div key={variation.id} className="flex items-center space-x-2 py-1 pl-7">
                              <Checkbox
                                id={`var-${variation.id}`}
                                checked={false}
                                onCheckedChange={() => handleVariationCheckboxChange(variation.id)}
                              />
                              <Label htmlFor={`var-${variation.id}`} className="cursor-pointer">
                                {variation.name}
                                {variation.additionalPrice > 0 && ` (+R$ ${variation.additionalPrice.toFixed(2)})`}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {variations.length === 0 && (
                        <p className="text-sm text-gray-500 py-2">
                          Nenhuma variação disponível. Adicione variações primeiro.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="applyToHalfPizza"
                checked={editVariationGroup.applyToHalfPizza || false}
                onCheckedChange={(checked) =>
                  setEditVariationGroup({ ...editVariationGroup, applyToHalfPizza: checked as boolean })
                }
              />
              <Label htmlFor="applyToHalfPizza" className="text-sm font-normal cursor-pointer">
                Aplicar a pizzas meio a meio
              </Label>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="allowPerHalf"
                checked={editVariationGroup.allowPerHalf || false}
                onCheckedChange={(checked) =>
                  setEditVariationGroup({ ...editVariationGroup, allowPerHalf: checked as boolean })
                }
              />
              <Label htmlFor="allowPerHalf" className="text-sm font-normal cursor-pointer">
                Permitir adicionar em cada metade (pizza meio a meio)
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Quando ativo, o cliente pode escolher se o adicional vai na metade 1, metade 2 ou pizza inteira
            </p>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setEditVariationGroup(null)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveVariationGroup}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
