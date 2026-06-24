import React from "react";
import { Category } from "@/types/menu";
import { cn } from "@/lib/utils";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { useCategoryColors } from "@/hooks/useCategoryColors";

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const { getColors } = useCategoryColors();

  return (
    <div className="sticky top-0 z-50 bg-white shadow-md w-full">
      {/* ALTERADO: Isolamos o 'overflow-x-auto' nesta div interna e injetamos um estilo inline 
        para garantir que NENHUM navegador mobile reserve espaço para a barra de rolagem.
      */}
      <div 
        className="overflow-x-auto px-4 py-2 flex items-center space-x-3 md:space-x-5"
        style={{
          msOverflowStyle: 'none',  /* IE e Edge */
          scrollbarWidth: 'none',   /* Firefox */
        }}
      >
        {/* Adicionado este bloco style para cobrir o Google Chrome/Safari Mobile */}
        <style dangerouslySetInnerHTML={{__html: `
          .overflow-x-auto::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}} />

        {categories.map((category) => {
          const catColors = getColors(category.id);
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "food-category whitespace-nowrap hover:opacity-80 transition-colors px-3 py-1.5 rounded-full text-[11px] md:text-xs font-semibold",
                activeCategory === category.id && "active"
              )}
              style={{
                color: catColors.fontColor,
                backgroundColor: catColors.bgColor,
              }}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryNav;
