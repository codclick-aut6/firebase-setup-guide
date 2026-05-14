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
    <div className="sticky top-0 z-50 overflow-x-auto bg-white py-1 md:py-2 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex space-x-4 md:space-x-8">
          {categories.map((category) => {
            const catColors = getColors(category.id);
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
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
