import { supabase } from "@/integrations/supabase/client";
import { Category, POPULAR_CATEGORY_ID } from "@/types/menu";

type Row = {
  id: string;
  name: string;
  order: number;
  is_popular_category: boolean;
  visible: boolean;
  columns_mobile?: number | null;
};

const fromRow = (r: Row): Category => ({
  id: r.id,
  name: r.name,
  order: r.order ?? 0,
  isPopularCategory: r.is_popular_category ?? false,
  visible: r.visible ?? true,
  columnsMobile: r.columns_mobile ?? null,
});

const toRow = (c: Category) => ({
  id: c.id,
  name: c.name,
  order: c.order ?? 0,
  is_popular_category: c.isPopularCategory ?? false,
  visible: c.visible ?? true,
  columns_mobile: c.columnsMobile ?? null,
});

const ensurePopularCategory = async (): Promise<void> => {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("id", POPULAR_CATEGORY_ID)
    .maybeSingle();
  if (!data) {
    await supabase.from("categories").insert({
      id: POPULAR_CATEGORY_ID,
      name: "Produtos Mais Vendidos",
      order: 0,
      is_popular_category: true,
      visible: true,
    });
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  await ensurePopularCategory();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
};

export const getCategory = async (id: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
};

export const saveCategory = async (category: Category): Promise<string> => {
  const id = category.id && category.id.trim() !== "" ? category.id : crypto.randomUUID();
  const row = toRow({ ...category, id });
  const { error } = await supabase.from("categories").upsert(row as any);
  if (error) throw error;
  return id;
};

export const updateCategory = async (category: Category): Promise<string> => {
  if (!category.id) throw new Error("Category ID is required for updates");
  const { id, ...rest } = toRow(category);
  const { error } = await supabase.from("categories").update(rest as any).eq("id", id);
  if (error) throw error;
  return id;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
};

export const fixCategoryOrders = async (): Promise<{
  success: boolean;
  message: string;
  updatedCount: number;
}> => {
  const cats = await getAllCategories();
  let updated = 0;
  for (let i = 0; i < cats.length; i++) {
    if (cats[i].order !== i) {
      const { error } = await supabase
        .from("categories")
        .update({ order: i })
        .eq("id", cats[i].id);
      if (!error) updated++;
    }
  }
  return { success: true, message: "Category orders updated successfully", updatedCount: updated };
};

export const getHighestCategoryOrder = async (): Promise<number> => {
  const cats = await getAllCategories();
  if (cats.length === 0) return -1;
  return Math.max(...cats.map((c) => (typeof c.order === "number" ? c.order : -1)));
};

export const seedCategories = async (categories: Category[]): Promise<void> => {
  for (const c of categories) await saveCategory(c);
};
