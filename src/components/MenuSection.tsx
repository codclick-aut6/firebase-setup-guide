
import React from "react";
import { MenuItem } from "@/types/menu";
import MenuItemCard from "./MenuItemCard";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { useCategoryColors } from "@/hooks/useCategoryColors";

interface MenuSectionProps {
  title: string;
  categoryId?: string;
  items: MenuItem[];
  itemRefs?: React.MutableRefObject<Record<string, { triggerClick: () => void } | null>>;
}

const MenuSection: React.FC<MenuSectionProps> = ({ title, categoryId, items, itemRefs }) => {
  const { settings } = useLayoutSettings();
  const { getColors } = useCategoryColors();

  if (items.length === 0) {
    return null;
  }

  const catColors = categoryId ? getColors(categoryId) : null;

  return (
    <div className="mb-12">
      <h2
        className="text-2xl font-bold mb-6 inline-block px-3 py-1 rounded"
        style={{
          color: catColors?.fontColor || settings.cor_fonte_titulos,
          backgroundColor: catColors?.bgColor || 'transparent',
        }}
        id={title.toLowerCase().replace(/\s+/g, '-')}
      >
        {title}
      </h2>
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${settings.layout_colunas_mobile === '2' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            ref={(handle) => {
              if (itemRefs) {
                itemRefs.current[item.id] = handle;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MenuSection;
