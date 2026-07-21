import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import { MenuItem, Category, POPULAR_CATEGORY_ID } from "@/types/menu";
import RestaurantHeader from "@/components/RestaurantHeader";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, MessageCircle, ClipboardList, LogOut, LogIn, UserCircle2 } from "lucide-react";
import ChatAssistant from "@/components/ChatAssistant";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackViewItemList, trackMenuVisit } from "@/utils/trackingEvents";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { useActiveOrdersCount } from "@/hooks/useActiveOrdersCount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import StoreClosedBanner from "@/components/StoreClosedBanner";
import { useBannerAction } from "@/hooks/useBannerAction";

const Index = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [scrollSpyCategory, setScrollSpyCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useLayoutSettings();
  const runBannerAction = useBannerAction();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const activeOrdersCount = useActiveOrdersCount();
  const itemRefs = useRef<Record<string, { triggerClick: () => void } | null>>({});
  const deepLinkHandled = useRef(false);
  const menuVisitTracked = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const [items, cats] = await Promise.all([getAllMenuItems(), getAllCategories()]);
      setMenuItems(items.filter(item => item.available !== false || (item.stock !== null && item.stock <= 0)));
      setCategories([{ id: "all", name: "Todos", order: -1 }, ...cats.filter(c => c.visible !== false)]);
    };
    loadData();
    if (!menuVisitTracked.current) {
      menuVisitTracked.current = true;
      trackMenuVisit();
    }
  }, []);

  useEffect(() => {
    const stripeStatus = searchParams.get("stripe");
    const sessionId = searchParams.get("session_id");
    const orderId = searchParams.get("order");
    if (!stripeStatus) return;

    if (stripeStatus === "success" && sessionId) {
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verificar-stripe-pagamento", {
            body: { sessionId, orderId },
          });
          if (error) throw error;
          if (data?.paid) {
            toast({ title: "Pagamento confirmado!", description: "Seu pedido foi pago com sucesso." });
          } else {
            toast({
              title: "Pagamento pendente",
              description: `Status: ${data?.payment_status || "desconhecido"}`,
            });
          }
        } catch (e: any) {
          toast({
            title: "Erro ao verificar pagamento",
            description: e.message || "Tente novamente.",
            variant: "destructive",
          });
        } finally {
          searchParams.delete("stripe");
          searchParams.delete("session_id");
          searchParams.delete("order");
          setSearchParams(searchParams, { replace: true });
        }
      })();
    } else if (stripeStatus === "cancel") {
      toast({ title: "Pagamento cancelado", description: "Você cancelou o pagamento.", variant: "destructive" });
      searchParams.delete("stripe");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Deep link por categoria: ?cat=<id> seleciona a categoria e rola ao topo
  useEffect(() => {
    const catId = searchParams.get("cat");
    if (!catId || categories.length === 0) return;
    const found = categories.find((c) => c.id === catId);
    if (!found) return;
    setActiveCategory(catId);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
    searchParams.delete("cat");
    setSearchParams(searchParams, { replace: true });
  }, [categories, searchParams, setSearchParams]);

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

  // Scroll spy: destaca a categoria em foco enquanto o usuário rola a página (apenas em "Todos")
  useEffect(() => {
    if (activeCategory !== "all" || groupedItems.length === 0) {
      setScrollSpyCategory(null);
      return;
    }
    const handleScroll = () => {
      const navOffset = 120; // altura aproximada do sticky nav
      let currentId: string | null = null;
      for (const { category } of groupedItems) {
        const el = document.getElementById(`cat-section-${category.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - navOffset <= 0) {
          currentId = category.id;
        } else {
          break;
        }
      }
      setScrollSpyCategory(currentId ?? groupedItems[0]?.category.id ?? null);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeCategory, groupedItems]);

  const highlightCategory =
    activeCategory === "all" ? (scrollSpyCategory ?? "all") : activeCategory;

  return (
    <div style={{ backgroundColor: settings.cor_background, color: settings.cor_fonte, minHeight: '100vh' }}>
      
      {/* HEADER COMPACTADO */}
      <div className="mt-0 md:mt-0 relative z-20 w-full px-0">
        <RestaurantHeader
          onBannerClick={() =>
            runBannerAction(
              (settings as any).banner_principal_action_type,
              (settings as any).banner_principal_action_value,
              (settings as any).banner_principal_action_target
            )
          }
          actions={
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-3 gap-2 flex-1">
                <Button
                  variant="outline"
                  onClick={() => setIsChatOpen(true)}
                  className="w-full px-1 text-[11px] md:text-sm h-9 flex items-center justify-center gap-1"
                  style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Fale Conosco
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => (currentUser ? navigate("/meus-pedidos") : navigate("/login"))}
                    className="w-full px-1 text-[11px] md:text-sm h-9 flex items-center justify-center gap-1"
                    style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Meus Pedidos
                  </Button>
                  {currentUser && activeOrdersCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white">
                      {activeOrdersCount}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={currentUser ? () => logOut() : () => navigate("/login")}
                  className="w-full px-1 text-[11px] md:text-sm h-9 flex items-center justify-center gap-1"
                  style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
                >
                  {currentUser ? <LogOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                  {currentUser ? "Sair" : "Entrar"}
                </Button>
              </div>
              {currentUser && (
                <button
                  type="button"
                  aria-label="Perfil"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ color: settings.cor_fonte }}
                >
                  <UserCircle2 className="h-7 w-7" />
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* ALTERADO: Ajustado o wrapper e adicionado -mt-1 no mobile para eliminar o espaço fantasma */}
      {(() => {
        const quantidade = (settings as any).banner_extra_quantidade || '2';
        const tamanho = (settings as any).banner_extra_tamanho || 'normal';
        const isSingle = quantidade === '1';
        const isLongo = isSingle && tamanho === 'longo';

        // Quando único, exibe apenas o banner 1
        const urls = isSingle
          ? [settings.empresa_banner_extra1_url]
          : [settings.empresa_banner_extra1_url, settings.empresa_banner_extra2_url];

        const hasAny = urls.some((u) => !!u);
        if (!hasAny) return null;

        const renderBanner = (url: string, i: number, ratio: string) =>
          url ? (
            <div
              key={i}
              className="w-full overflow-hidden rounded-lg bg-muted cursor-pointer shadow-sm"
              style={{ aspectRatio: ratio }}
              onClick={() =>
                runBannerAction(
                  (settings as any)[`banner_extra${i + 1}_action_type`],
                  (settings as any)[`banner_extra${i + 1}_action_value`],
                  (settings as any)[`banner_extra${i + 1}_action_target`]
                )
              }
            >
              <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ) : null;

        return (
          <div className="w-full bg-white px-4 pt-1 pb-0 md:pt-1 md:pb-3 border-b border-muted/40 -mt-1 md:mt-0 relative z-10">
            {isLongo ? (
              // Banner longo: mesma proporção 4:1 (1000x250) no mobile e desktop
              <div className="max-w-4xl mx-auto">
                {renderBanner(settings.empresa_banner_extra1_url, 0, "4 / 1")}
              </div>
            ) : isSingle ? (
              // Banner único normal: centralizado com a largura de um banner
              <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
                <div className="col-start-1 col-end-3 mx-auto w-[calc(50%-0.375rem)]">
                  {renderBanner(settings.empresa_banner_extra1_url, 0, "2 / 1")}
                </div>
              </div>
            ) : (
              // Dois banners lado a lado
              <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
                {urls.map((url, i) => renderBanner(url, i, "2 / 1"))}
              </div>
            )}
          </div>
        );
      })()}


      {/* BANNER DE LOJA FECHADA */}
      <div className="max-w-3xl mx-auto px-4">
        <StoreClosedBanner />
      </div>
        
      {/* BUSCA MOBILE */}
      <div className="order-1 md:order-3 px-4 z-10 mt-1 flex md:hidden mb-1">
        <div className="relative w-full max-w-4xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
          <Input
            type="text"
            placeholder="Busque por pizza ou ingredientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-12 text-sm border-2 border-muted bg-card shadow-md rounded-xl focus-visible:ring-primary"
          />
          {searchTerm && (
            <X
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* MENU DE CATEGORIAS */}
      <CategoryNav 
        categories={categories.filter(c => c.id === "all" || c.showInCategoryNav !== false)} 
        activeCategory={highlightCategory}
        onSelectCategory={(id) => {
          if (activeCategory === "all" && id !== "all") {
            const el = document.getElementById(`cat-section-${id}`);
            if (el) {
              const y = el.getBoundingClientRect().top + window.scrollY - 100;
              window.scrollTo({ top: y, behavior: "smooth" });
              setScrollSpyCategory(id);
              return;
            }
          }
          setActiveCategory(id);
        }}
      />

      {/* BUSCA DESKTOP */}
      <div className="px-4 z-10 mt-6 mb-6 hidden md:block">
        <div className="relative w-full max-w-4xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
          <Input
            type="text"
            placeholder="Busque por pizza ou ingredientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-12 text-sm border-2 border-muted bg-card shadow-md rounded-xl focus-visible:ring-primary"
          />
          {searchTerm && <X onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" />}
        </div>
      </div>

      {/* CONTAINER DE PRODUTOS */}
      <div className="container mx-auto px-4 pt-0 pb-8 md:pt-8">
        {activeCategory === "all" ? (
          groupedItems.map(({ category, items }) => (
            <MenuSection key={category.id} title={category.name} categoryId={category.id} category={category} items={items} itemRefs={itemRefs} />
          ))
        ) : (
          (() => {
            const cat = categories.find(c => c.id === activeCategory);
            return (
              <MenuSection
                title={cat?.name || "Menu"}
                categoryId={cat?.id}
                category={cat}
                items={filteredItems}
                itemRefs={itemRefs}
              />
            );
          })()
        )}
      </div>

      <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <ProfileDrawer open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
};

export default Index;
