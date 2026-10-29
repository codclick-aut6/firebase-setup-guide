// Verifica se um item do carrinho atende a um requisito do cupom "compre e ganhe".
// Requisitos por categoria podem listar várias categorias (category_ids); o campo
// legado category_id é mantido como fallback para cupons antigos.
export function itemMatchesRequirement(item: any, req: any): boolean {
  if (!item || !req) return false;
  if (req.tipo !== "categoria") return item.id === req.product_id;
  const ids: string[] = [
    ...(Array.isArray(req.category_ids) ? req.category_ids : []),
    ...(req.category_id ? [req.category_id] : []),
  ].filter(Boolean);
  if (!ids.length) return false;
  const itemCats: string[] = [
    item.category,
    ...(Array.isArray(item.additionalCategories) ? item.additionalCategories : []),
    ...(Array.isArray(item.additional_categories) ? item.additional_categories : []),
  ].filter(Boolean);
  return itemCats.some((c) => ids.includes(c));
}
