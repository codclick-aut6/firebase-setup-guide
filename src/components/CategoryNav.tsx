import React, { useEffect, useRef } from "react";
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
  const { settings } = useLayoutSettings();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const container = scrollRef.current;
    const btn = buttonRefs.current[activeCategory];
    if (!container || !btn) return;
    const target = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeCategory]);

  return (
    <div className="sticky top-0 z-50 bg-white shadow-md w-full">
      {/* ALTERADO: Isolamos o 'overflow-x-auto' nesta div interna e injetamos um estilo inline 
        para garantir que NENHUM navegador mobile reserve espaço para a barra de rolagem.
      */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto px-4 py-1 md:py-2 flex items-center space-x-3 md:space-x-5"
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
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
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              ref={(el) => { buttonRefs.current[category.id] = el; }}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "food-category whitespace-nowrap hover:opacity-80 transition-colors px-3 py-1.5 rounded-full text-[11px] md:text-xs font-semibold",
                isActive && "active"
              )}
              style={{
                color: isActive ? settings.cor_fonte_categoria_ativa : catColors.fontColor,
                backgroundColor: isActive ? settings.cor_destaque_categoria_ativa : catColors.bgColor,
                boxShadow: isActive ? `0 0 8px ${settings.cor_destaque_categoria_ativa}80` : undefined,
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
