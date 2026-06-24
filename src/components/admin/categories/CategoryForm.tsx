import React, { useState } from "react";
import { Category } from "@/types/menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { saveCategory, updateCategory, getHighestCategoryOrder } from "@/services/categoryService";

interface CategoryFormProps {
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  onDataChange: () => void;
}

type ColumnsValue = "default" | "1" | "2";

const toColumnsValue = (c: Category | null): ColumnsValue => {
  if (!c || c.columnsMobile == null) return "default";
  return c.columnsMobile === 2 ? "2" : "1";
};

export const CategoryForm = ({
  editingCategory,
  setEditingCategory,
  onDataChange,
}: CategoryFormProps) => {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState<string>(editingCategory?.name || "");
  const [columnsMobile, setColumnsMobile] = useState<ColumnsValue>(toColumnsValue(editingCategory));

  React.useEffect(() => {
    setNewCategory(editingCategory?.name || "");
    setColumnsMobile(toColumnsValue(editingCategory));
  }, [editingCategory]);

  const handleSaveCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da categoria é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const columnsMobileValue: number | null =
      columnsMobile === "default" ? null : Number(columnsMobile);

    try {
      if (editingCategory) {
        const updatedCategory: Category = {
          ...editingCategory,
          name: newCategory,
          columnsMobile: columnsMobileValue,
        };
        await updateCategory(updatedCategory);
      } else {
        const highestOrder = await getHighestCategoryOrder();
        const newCat: Category = {
          id: newCategory.toLowerCase().replace(/\s+/g, '-'),
          name: newCategory,
          order: highestOrder + 1,
          columnsMobile: columnsMobileValue,
        };
        await saveCategory(newCat);
      }

      setNewCategory("");
      setColumnsMobile("default");
      setEditingCategory(null);
      toast({
        title: "Sucesso",
        description: editingCategory
          ? "Categoria atualizada com sucesso"
          : "Categoria adicionada com sucesso",
      });
      onDataChange();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a categoria. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{editingCategory ? "Editar Categoria" : "Adicionar Categoria"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name">Nome da Categoria</Label>
            <Input
              id="category-name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Entradas, Pratos Principais, etc"
            />
          </div>
          <div>
            <Label htmlFor="category-columns">Colunas no mobile</Label>
            <Select value={columnsMobile} onValueChange={(v) => setColumnsMobile(v as ColumnsValue)}>
              <SelectTrigger id="category-columns">
                <SelectValue placeholder="Padrão (configuração global)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão (configuração global)</SelectItem>
                <SelectItem value="1">1 coluna</SelectItem>
                <SelectItem value="2">2 colunas</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Sobrescreve a configuração global apenas para esta categoria.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            {editingCategory && (
              <Button variant="outline" onClick={() => {
                setEditingCategory(null);
                setNewCategory("");
                setColumnsMobile("default");
              }}>
                Cancelar
              </Button>
            )}
            <Button onClick={handleSaveCategory}>
              <Save className="h-4 w-4 mr-1" />
              {editingCategory ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
