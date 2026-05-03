import React, { useState } from "react";
import { Category } from "@/types/menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { saveCategory, updateCategory, getHighestCategoryOrder } from "@/services/categoryService";

interface CategoryFormProps {
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  onDataChange: () => void;
}

export const CategoryForm = ({
  editingCategory,
  setEditingCategory,
  onDataChange,
}: CategoryFormProps) => {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState<string>(editingCategory?.name || "");

  React.useEffect(() => {
    setNewCategory(editingCategory?.name || "");
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

    try {
      if (editingCategory) {
        // Update existing category - keep the same ID and order, just change the name
        const updatedCategory = {
          ...editingCategory,
          name: newCategory,
        };
        await updateCategory(updatedCategory);
      } else {
        // Add new category - get highest order and add 1
        const highestOrder = await getHighestCategoryOrder();
        const newCat: Category = {
          id: newCategory.toLowerCase().replace(/\s+/g, '-'),
          name: newCategory,
          order: highestOrder + 1
        };
        await saveCategory(newCat);
      }
      
      setNewCategory("");
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
          <div className="flex justify-end gap-2">
            {editingCategory && (
              <Button variant="outline" onClick={() => {
                setEditingCategory(null);
                setNewCategory("");
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
