import React, { useState, useEffect } from "react";
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
  const [isSticky, setIsSticky] = useState(false);
  const { settings } = useLayoutSettings();
  const { getColors } = useCategoryColors();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        // Alterado py-4 para py-2 (metade) e no mobile py-1 para ser ainda mais compacto
        "overflow-x-auto bg-white py-1 md:py-2 transition-all duration-300 z-10",
        isSticky && "sticky top-0 shadow-md"
      )}
    >
      <div className="container mx-auto px-4">
        {/* Alterado space-x-8 para space-x-4 no mobile para caber mais itens */}
        <div className="flex space-x-4 md:space-x-8">
          {categories.map((category) => {
            const catColors = getColors(category.id);
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  // Removido pb-2 que adicionava espaço extra abaixo do texto
                  "food-category whitespace-nowrap hover:opacity-80 transition-colors px-3 py-1 rounded text-sm md:text-base",
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
    </div>
  );
};

export default CategoryNav;
