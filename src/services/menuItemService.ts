import { supabase } from "@/integrations/supabase/client";
import { MenuItem, VariationGroup, PizzaBorder } from "@/types/menu";

type Row = {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  image: string;
  category: string;
  additional_categories: string[] | null;
  popular: boolean | null;
  available: boolean | null;
  has_variations: boolean | null;
  variation_groups: any;
  price_from: boolean | null;
  tipo: string | null;
  permite_combinacao: boolean | null;
  max_sabores: number | null;
  is_half_pizza: boolean | null;
  combination: any;
  pizza_borders: any;
  borders_position: number | null;
  frete_gratis: boolean | null;
  sku: string | null;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  stock: number | null;
};

const fromRow = (r: Row): MenuItem => ({
  id: r.id,
  name: r.name,
  description: r.description ?? "",
  price: Number(r.price ?? 0),
  cost: r.cost == null ? undefined : Number(r.cost),
  image: r.image ?? "/placeholder.svg",
  category: r.category,
  additionalCategories: r.additional_categories ?? [],
  popular: r.popular ?? false,
  available: r.available ?? true,
  hasVariations: r.has_variations ?? false,
  variationGroups: (r.variation_groups ?? []) as VariationGroup[],
  priceFrom: r.price_from ?? false,
  tipo: (r.tipo as "padrao" | "pizza") ?? "padrao",
  permiteCombinacao: r.permite_combinacao ?? false,
  maxSabores: r.max_sabores ?? undefined,
  isHalfPizza: r.is_half_pizza ?? false,
  combination: r.combination ?? undefined,
  pizzaBorders: (r.pizza_borders ?? []) as PizzaBorder[],
  bordersPosition: r.borders_position ?? undefined,
  freteGratis: r.frete_gratis ?? false,
  sku: r.sku ?? undefined,
  weightG: r.weight_g == null ? undefined : Number(r.weight_g),
  lengthCm: r.length_cm == null ? undefined : Number(r.length_cm),
  widthCm: r.width_cm == null ? undefined : Number(r.width_cm),
  heightCm: r.height_cm == null ? undefined : Number(r.height_cm),
  stock: r.stock == null ? null : Number(r.stock),
});

const toRow = (m: MenuItem) => ({
  id: m.id,
  name: m.name,
  description: m.description ?? "",
  price: m.price ?? 0,
  cost: m.cost ?? null,
  image: m.image || "/placeholder.svg",
  category: m.category,
  additional_categories: m.additionalCategories ?? [],
  popular: m.popular ?? false,
  available: m.available !== false,
  has_variations: m.hasVariations ?? false,
  variation_groups: m.variationGroups ?? [],
  price_from: m.priceFrom ?? false,
  tipo: m.tipo ?? "padrao",
  permite_combinacao: m.permiteCombinacao ?? false,
  max_sabores: m.maxSabores ?? null,
  is_half_pizza: m.isHalfPizza ?? false,
  combination: m.combination ?? null,
  pizza_borders: m.pizzaBorders ?? [],
  borders_position: m.bordersPosition ?? null,
  frete_gratis: m.freteGratis ?? false,
  sku: m.sku ?? null,
  weight_g: m.weightG ?? null,
  length_cm: m.lengthCm ?? null,
  width_cm: m.widthCm ?? null,
  height_cm: m.heightCm ?? null,
  stock: m.stock ?? null,
});

let _allMenuItemsCache: { data: MenuItem[]; ts: number } | null = null;
let _allMenuItemsInFlight: Promise<MenuItem[]> | null = null;
const MENU_ITEMS_TTL_MS = 60_000;

export const invalidateMenuItemsCache = () => {
  _allMenuItemsCache = null;
  _allMenuItemsInFlight = null;
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  const now = Date.now();
  if (_allMenuItemsCache && now - _allMenuItemsCache.ts < MENU_ITEMS_TTL_MS) {
    return _allMenuItemsCache.data;
  }
  if (_allMenuItemsInFlight) return _allMenuItemsInFlight;
  _allMenuItemsInFlight = (async () => {
    const { data, error } = await supabase.from("menu_items").select("*");
    if (error) {
      _allMenuItemsInFlight = null;
      throw error;
    }
    const items = (data as Row[]).map(fromRow);
    _allMenuItemsCache = { data: items, ts: Date.now() };
    _allMenuItemsInFlight = null;
    return items;
  })();
  return _allMenuItemsInFlight;
};

export const getMenuItem = async (id: string): Promise<MenuItem | null> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
};

export const saveMenuItem = async (menuItem: MenuItem): Promise<string> => {
  if (!menuItem.name || !menuItem.description || !menuItem.category) {
    throw new Error("Campos obrigatórios não preenchidos: nome, descrição e categoria são obrigatórios");
  }
  if (menuItem.price <= 0) throw new Error("O preço deve ser maior que zero");

  const isNew = !menuItem.id || menuItem.id.trim() === "" || menuItem.id.startsWith("temp-");
  const id = isNew ? crypto.randomUUID() : menuItem.id;
  const row = toRow({ ...menuItem, id });

  const { error } = await supabase.from("menu_items").upsert(row as any);
  if (error) throw new Error(`Falha ao salvar item: ${error.message}`);
  invalidateMenuItemsCache();
  return id;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  if (!id || id.trim() === "") throw new Error("ID do item é obrigatório");
  const cleanId = id.trim();
  if (cleanId.startsWith("temp-")) return;
  const { error } = await supabase.from("menu_items").delete().eq("id", cleanId);
  if (error) throw error;
  invalidateMenuItemsCache();
};

export const getMenuItemsByCategory = async (categoryId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("category", categoryId);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
};

export const getPopularItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("popular", true);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
};

export const cleanupPopularItems = async (): Promise<{ cleaned: number; total: number }> => {
  const items = await getPopularItems();
  return { cleaned: 0, total: items.length };
};

export const seedMenuItems = async (menuItems: MenuItem[]): Promise<void> => {
  for (const item of menuItems) await saveMenuItem(item);
};
