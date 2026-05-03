export interface PizzaBorder {
  id: string;
  name: string;
  description?: string;
  additionalPrice: number;
  available: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  cost?: number; // Custo do produto
  image: string;
  category: string;
  additionalCategories?: string[]; // Categorias adicionais — item aparece em múltiplas categorias
  popular?: boolean;
  available?: boolean; // Indica se o produto está disponível
  hasVariations?: boolean;
  variationGroups?: VariationGroup[]; // Now accepts only VariationGroup objects
  priceFrom?: boolean; // New property to indicate "a partir de" pricing
  tipo?: "padrao" | "pizza"; // Type of item - standard or pizza
  permiteCombinacao?: boolean; // Allow half-and-half combinations for pizzas
  maxSabores?: number; // Maximum number of flavors for combinations
  isHalfPizza?: boolean; // Indicates if this is a half pizza combination
  combination?: {
    sabor1: { id: string; name: string };
    sabor2: { id: string; name: string };
    tamanho: "broto" | "grande";
  };
  pizzaBorders?: PizzaBorder[]; // Bordas disponíveis para esta pizza
  bordersPosition?: number; // Posição da seção de bordas entre os grupos de variação
  freteGratis?: boolean; // Indica se o item concede frete grátis ao pedido
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariations?: SelectedVariationGroup[];
  selectedBorder?: PizzaBorder; // Borda selecionada para pizza
  isHalfPizza?: boolean; // Indicates if this is a half pizza combination
  combination?: {
    sabor1: { id: string; name: string };
    sabor2: { id: string; name: string };
    tamanho: "broto" | "grande";
  };
}

export interface SelectedVariationGroup {
  groupId: string;
  groupName: string;
  variations: SelectedVariation[];
}

// SelectedVariation movido para o final do arquivo após HalfSelection

export interface Category {
  id: string;
  name: string;
  order?: number;
  isPopularCategory?: boolean; // Categoria fixa de "Produtos Mais Vendidos"
  visible?: boolean; // Controla exibição da categoria (usado pela categoria de populares)
}

export const POPULAR_CATEGORY_ID = "popular-items";

export interface Variation {
  id: string;
  name: string;
  description?: string;
  additionalPrice?: number;
  available: boolean;
  categoryIds: string[]; // Categories where this variation can be used
}

export interface VariationGroup {
  id: string;
  name: string;
  internalName?: string;
  minRequired: number;
  maxAllowed: number;
  variations: string[];
  customMessage?: string;
  applyToHalfPizza?: boolean; // Indica se o grupo aparece em pizzas meio a meio
  allowPerHalf?: boolean; // Permite adicionar em cada metade da pizza
}

// Tipo para especificar em qual metade o adicional foi aplicado
export type HalfSelection = "half1" | "half2" | "whole";

export interface SelectedVariation {
  variationId: string;
  quantity: number;
  name?: string;
  additionalPrice?: number;
  halfSelection?: HalfSelection; // Em qual metade o adicional foi aplicado
}
