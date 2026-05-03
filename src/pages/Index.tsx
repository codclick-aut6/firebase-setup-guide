import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import { MenuItem, Category, POPULAR_CATEGORY_ID } from "@/types/menu";
import RestaurantHeader from "@/components/RestaurantHeader";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, MessageCircle, ClipboardList, LogOut, LogIn } from "lucide-react";
import ChatAssistant from "@/components/ChatAssistant";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackViewItemList, trackMenuVisit } from "@/utils/trackingEvents";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

const Index = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useLayoutSettings();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const itemRefs = useRef<Record<string, { triggerClick: () => void } | null>>({});
  const deepLinkHandled = useRef(false);
  const menuVisitTracked = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const [items, cats] = await Promise.all([getAllMenuItems(), getAllCategories()]);
      setMenuItems(items.filter(item => item.available !== false));
      setCategories([{ id: "all", name: "Todos", order: -1 }, ...cats.filter(c => c.visible !== false)]);
    };
    loadData();
    if (!menuVisitTracked.current) {
      menuVisitTracked.current = true;
      trackMenuVisit();
    }
  }, []);

  const handleDeepLink = useCallback(() => {
    if (deepLinkHandled.current) return;
    const itemId = searchParams.get("item");
    if (!itemId || menuItems.length === 0) return;
    const matchedItem = menuItems.find(i => i.id === itemId);
    if (!matchedItem) return;

    let attempts = 0;
    const tryOpen = () => {
      const el = document.querySelector(`[data-product-id="${itemId}"]`);
      const handle = itemRefs.current[itemId];
      if (el && handle) {
        deepLinkHandled.current = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          handle.triggerClick();
          searchParams.delete("item");
          setSearchParams(searchParams, { replace: true });
        }, 600);
      } else if (attempts++ < 50) setTimeout(tryOpen, 100);
    };
    tryOpen();
  }, [menuItems, searchParams, setSearchParams]);

  useEffect(() => { handleDeepLink(); }, [handleDeepLink]);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchTerm === "" || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" ? true : activeCategory === POPULAR_CATEGORY_ID ? item.popular : (item.category === activeCategory || (item.additionalCategories || []).includes(activeCategory));
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const groupedItems = categories.reduce((acc, category) => {
    if (category.id === "all") return acc;
    const items = filteredItems.filter(item => category.id === POPULAR_CATEGORY_ID ? item.popular : (item.category === category.id || (item.additionalCategories || []).includes(category.id))).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (items.length > 0) acc.push({ category, items });
    return acc;
  }, [] as Array<{ category: Category; items: MenuItem[] }>);

  return (
    <div style={{ backgroundColor: settings.cor_background, color: settings.cor_fonte, minHeight: '100vh' }}>
      
      {/* HEADER COM SOBREPOSIÇÃO NO BANNER */}
      <div className="-mt-12 md:mt-0 relative z-20">
        <RestaurantHeader
          actions={
            <div className="flex flex-col items-center md:items-end gap-1.5 md:gap-2">
              <div className="flex flex-row items-center gap-1.5 md:gap-2">
                <Button variant="outline" onClick={() => setIsChatOpen(true)} className="px-1.5 text-[10px] md:text-sm h-9" style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}><MessageCircle className="h-3 w-3" /> Fale Conosco</Button>
                {currentUser && <Button variant="outline" onClick={() => navigate("/meus-pedidos")} className="px-1.5 text-[10px] md:text-sm h-9" style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}><ClipboardList className="h-3 w-3" /> Pedidos</Button>}
                <Button variant="outline" onClick={currentUser ? () => logOut() : () => navigate("/login")} className="px-1.5 text-[10px] md:text-sm h-9" style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}>{currentUser ? <LogOut className="h-3 w-3" /> : <LogIn className="h-3 w-3" />} {currentUser ? "Sair" : "Entrar"}</Button>
              </div>
              {/* RESTAURADO: E-mail do usuário aparece abaixo dos botões se estiver logado */}
              {currentUser && (
                <span className="text-center md:text-right w-full block" style={{ fontSize: '11px', color: settings.cor_fonte, opacity: 0.8 }}>
                  {currentUser.email}
                </span>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-col">
        <div className="order-1 md:order-2 px-4 z-10 -mt-4 md:mt-8">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
            <Input
              type="text"
              placeholder="Busque pizza ou ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-12 text-xs border-2 border-muted bg-card shadow-md rounded-xl focus-visible:ring-primary"
            />
            {searchTerm && <X onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" />}
          </div>
        </div>

        <div className="order-2 md:order-1 mt-2 md:mt-0">
          <CategoryNav 
            categories={categories} 
            activeCategory={activeCategory}
            onSelectCategory={(id) => setActiveCategory(id)}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-0 pb-8 md:pt-8">
        {activeCategory === "all" ? (
          groupedItems.map(({ category, items }) => (
            <MenuSection key={category.id} title={category.name} items={items} itemRefs={itemRefs} />
          ))
        ) : (
          <MenuSection title={categories.find(c => c.id === activeCategory)?.name || "Menu"} items={filteredItems} itemRefs={itemRefs} />
        )}
      </div>
      <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Index;
