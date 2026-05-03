import React from "react";
import { MenuItem, Category, Variation, VariationGroup, PizzaBorder } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle, Upload, Image as ImageIcon, Copy, Link } from "lucide-react";
import { saveMenuItem } from "@/services/menuItemService";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VariationGroupsSection } from "./VariationGroupsSection";
import { PizzaBordersSection } from "./PizzaBordersSection";

interface EditMenuItemModalProps {
  editItem: MenuItem;
  setEditItem: (item: MenuItem | null) => void;
  menuItems: MenuItem[];
  categories: Category[];
  variations: Variation[];
  variationGroups: VariationGroup[];
  pizzaBorders?: PizzaBorder[];
  onSuccess: () => void;
}

export const EditMenuItemModal = ({
  editItem,
  setEditItem,
  menuItems,
  categories,
  variations,
  variationGroups,
  pizzaBorders = [],
  onSuccess,
}: EditMenuItemModalProps) => {
  const { toast } = useToast();
  const { uploadImage, isUploading } = useImageUpload();

  const handleSaveItem = async () => {
    if (!editItem.name || !editItem.description || editItem.price <= 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!editItem.category) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria para o item",
        variant: "destructive",
      });
      return;
    }

    if (editItem.hasVariations && editItem.variationGroups) {
      for (const group of editItem.variationGroups) {
        if (!group.name || group.variations.length === 0) {
          toast({
            title: "Grupos de variação incompletos",
            description:
              "Todos os grupos de variação devem ter nome e pelo menos uma variação selecionada",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      const itemToSave = {
        ...editItem,
        hasVariations:
          !!(editItem.variationGroups && editItem.variationGroups.length > 0),
      };

      await saveMenuItem(itemToSave);
      setEditItem(null);
      toast({
        title: "Sucesso",
        description: "Item salvo com sucesso",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Não foi possível salvar o item: ${
          error.message || "Erro desconhecido"
        }`,
        variant: "destructive",
      });
    }
  };

  const validCategories = categories.filter((category) => {
    const isValid =
      category &&
      category.id &&
      typeof category.id === "string" &&
      category.id.trim() !== "" &&
      category.name &&
      typeof category.name === "string" &&
      category.name.trim() !== "";
    return isValid;
  });

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 1MB",
        variant: "destructive",
      });
      return;
    }

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setEditItem({ ...editItem, image: imageUrl });
    }
  };

  return (
    <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editItem.id && menuItems.some((item) => item.id === editItem.id)
              ? "Editar Item"
              : "Novo Item"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setEditItem(null)}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Deep Link */}
        {editItem.id && menuItems.some((item) => item.id === editItem.id) && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md">
            <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {`${window.location.origin}/?item=${editItem.id}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/?item=${editItem.id}`);
                toast({ title: "Link copiado!", duration: 1500 });
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={editItem.name}
              onChange={(e) =>
                setEditItem({ ...editItem, name: e.target.value })
              }
              placeholder="Nome do item"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={editItem.description}
              onChange={(e) =>
                setEditItem({ ...editItem, description: e.target.value })
              }
              placeholder="Descrição do item"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={editItem.price}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={editItem.cost || 0}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    cost: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              {validCategories.length === 0 ? (
                <div className="text-sm text-red-500 p-2 border border-red-300 rounded">
                  Nenhuma categoria válida encontrada. Crie categorias primeiro.
                </div>
              ) : (
                <Select
                  value={
                    editItem.category &&
                    validCategories.some((cat) => cat.id === editItem.category)
                      ? editItem.category
                      : ""
                  }
                  onValueChange={(value) =>
                    setEditItem({ ...editItem, category: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {validCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Categorias adicionais */}
          {validCategories.length > 0 && (
            <div>
              <Label>Categorias adicionais (item aparecerá também nestas categorias)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                {validCategories
                  .filter((cat) => cat.id !== editItem.category && !cat.isPopularCategory)
                  .map((category) => {
                    const checked = (editItem.additionalCategories || []).includes(category.id);
                    return (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`addcat-${category.id}`}
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            const current = editItem.additionalCategories || [];
                            const updated = isChecked
                              ? [...current, category.id]
                              : current.filter((id) => id !== category.id);
                            setEditItem({ ...editItem, additionalCategories: updated });
                          }}
                        />
                        <Label htmlFor={`addcat-${category.id}`} className="text-sm font-normal cursor-pointer">
                          {category.name}
                        </Label>
                      </div>
                    );
                  })}
                {validCategories.filter((cat) => cat.id !== editItem.category && !cat.isPopularCategory).length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-2">Nenhuma outra categoria disponível.</p>
                )}
              </div>
            </div>
          )}

          {/* Tipo do item */}
          <div>
            <Label htmlFor="tipo">Tipo do Item</Label>
            <Select
              value={editItem.tipo || "padrao"}
              onValueChange={(value) =>
                setEditItem({ ...editItem, tipo: value as "padrao" | "pizza" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="padrao">Padrão</SelectItem>
                <SelectItem value="pizza">Pizza</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configurações de pizza */}
          {editItem.tipo === "pizza" && (
            <div className="space-y-3 border p-3 rounded-md bg-slate-50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="permiteCombinacao"
                  checked={editItem.permiteCombinacao || false}
                  onCheckedChange={(checked) =>
                    setEditItem({
                      ...editItem,
                      permiteCombinacao: checked === true,
                    })
                  }
                />
                <Label htmlFor="permiteCombinacao">Permitir meio a meio</Label>
              </div>

              {editItem.permiteCombinacao && (
                <div>
                  <Label htmlFor="maxSabores">Número máximo de sabores</Label>
                  <Input
                    id="maxSabores"
                    type="number"
                    min="2"
                    value={editItem.maxSabores || 2}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        maxSabores: parseInt(e.target.value) || 2,
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="image">Imagem do Item</Label>
            <div className="space-y-3">
              <Input
                id="image"
                value={editItem.image}
                onChange={(e) =>
                  setEditItem({ ...editItem, image: e.target.value })
                }
                placeholder="URL da imagem ou faça upload de uma imagem"
              />

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Enviar Imagem
                      </div>
                    )}
                  </Button>
                </div>

                {editItem.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(editItem.image, "_blank")}
                    className="px-3"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {editItem.image && (
                <div className="mt-2 flex items-center gap-4">
                  <img
                    src={editItem.image}
                    alt="Preview"
                    className="max-w-full max-h-32 object-cover rounded-md border"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <Button onClick={handleSaveItem} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="available"
              checked={editItem.available !== false}
              onCheckedChange={(checked) =>
                setEditItem({ ...editItem, available: checked === true })
              }
            />
            <Label htmlFor="available">Produto disponível (se desmarcado, não aparecerá no cardápio)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="popular"
              checked={editItem.popular || false}
              onCheckedChange={(checked) =>
                setEditItem({ ...editItem, popular: checked === true })
              }
            />
            <Label htmlFor="popular">Item popular (destacado no cardápio)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="priceFrom"
              checked={editItem.priceFrom || false}
              onCheckedChange={(checked) =>
                setEditItem({ ...editItem, priceFrom: checked === true })
              }
            />
            <Label htmlFor="priceFrom">
              Preço "a partir de" (valor base não será somado no carrinho)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="freteGratis"
              checked={editItem.freteGratis || false}
              onCheckedChange={(checked) =>
                setEditItem({ ...editItem, freteGratis: checked === true })
              }
            />
            <Label htmlFor="freteGratis">
              🚚 Frete grátis (pedidos com este item terão frete grátis)
            </Label>
          </div>

          <VariationGroupsSectionWithPrices
            editItem={editItem}
            setEditItem={setEditItem}
            variations={variations}
            variationGroups={variationGroups}
            pizzaBorders={pizzaBorders}
            onDataChange={onSuccess}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem}>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VariationGroupsSectionWithPrices = ({
  editItem,
  setEditItem,
  variations,
  variationGroups,
  pizzaBorders = [],
  onDataChange,
}: {
  editItem: MenuItem;
  setEditItem: (item: MenuItem) => void;
  variations: Variation[];
  variationGroups: VariationGroup[];
  pizzaBorders?: PizzaBorder[];
  onDataChange?: () => void;
}) => {
  return (
    <VariationGroupsSection
      editItem={editItem}
      setEditItem={setEditItem}
      variations={variations}
      variationGroups={variationGroups}
      pizzaBorders={pizzaBorders}
      onDataChange={onDataChange}
    />
  );
};
                  
