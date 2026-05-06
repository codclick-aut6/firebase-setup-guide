import { supabase } from '@/integrations/supabase/client';
import { getSessionId, getVisitorId } from '@/utils/sessionId';
import { getUtmParams } from '@/utils/utmCapture';

/**
 * Marco temporal: o painel de inteligência ignora eventos anteriores a esta data,
 * pois eles foram registrados antes da introdução de visitor_id/session_id.
 */
export const FUNNEL_CUTOFF_ISO = '2026-04-27T00:00:00.000Z';

export type ProductEventType = 
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'begin_checkout'
  | 'update_cart_quantity'
  | 'update_checkout_quantity'
  | 'visita_cardapio_nova'
  | 'visita_cardapio_recorrente'
  | 'coupon_attempt'
  | 'coupon_failed';

interface ProductEventPayload {
  product_id: string;
  product_name: string;
  event_type: ProductEventType;
  price?: number;
  category?: string;
  quantity?: number;
}

/**
 * Persists a product event to Supabase (fire-and-forget).
 */
export const trackProductEvent = (payload: ProductEventPayload) => {
  const sessionId = getSessionId();
  const visitorId = getVisitorId();
  const utms = getUtmParams();

  supabase
    .from('product_events' as any)
    .insert({
      product_id: payload.product_id,
      product_name: payload.product_name,
      event_type: payload.event_type,
      price: payload.price ?? 0,
      category: payload.category ?? null,
      quantity: payload.quantity ?? 1,
      session_id: sessionId,
      visitor_id: visitorId,
      utm_source: utms.utm_source ?? null,
      utm_medium: utms.utm_medium ?? null,
      utm_campaign: utms.utm_campaign ?? null,
      utm_content: utms.utm_content ?? null,
      utm_term: utms.utm_term ?? null,
    })
    .then(({ error }) => {
      if (error) console.error('Error tracking product event:', error);
    });
};

/**
 * Persists multiple product events at once (e.g. purchase with multiple items).
 */
export const trackProductEventsBatch = (items: ProductEventPayload[]) => {
  const sessionId = getSessionId();
  const visitorId = getVisitorId();
  const utms = getUtmParams();

  const rows = items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    event_type: item.event_type,
    price: item.price ?? 0,
    category: item.category ?? null,
    quantity: item.quantity ?? 1,
    session_id: sessionId,
    visitor_id: visitorId,
    utm_source: utms.utm_source ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_content: utms.utm_content ?? null,
    utm_term: utms.utm_term ?? null,
  }));

  supabase
    .from('product_events' as any)
    .insert(rows)
    .then(({ error }) => {
      if (error) console.error('Error tracking product events batch:', error);
    });
};

export interface ProductMetric {
  product_id: string;
  product_name: string;
  views: number;
  sales: number;
}

/**
 * Fetches aggregated product metrics (views + sales) for admin dashboard.
 */
export const getProductMetrics = async (): Promise<ProductMetric[]> => {
  const { data, error } = await supabase
    .from('product_events' as any)
    .select('product_id, product_name, event_type, quantity')
    ;

  if (error || !data) {
    console.error('Error fetching product metrics:', error);
    return [];
  }

  const metricsMap = new Map<string, ProductMetric>();

  (data as any[]).forEach((row: any) => {
    const key = row.product_id;
    if (!metricsMap.has(key)) {
      metricsMap.set(key, {
        product_id: row.product_id,
        product_name: row.product_name,
        views: 0,
        sales: 0,
      });
    }
    const m = metricsMap.get(key)!;
    if (row.event_type === 'view_item') m.views++;
    if (row.event_type === 'purchase') m.sales += (row.quantity ?? 1);
  });

  return Array.from(metricsMap.values());
};

// ---- Funnel data for admin-intelligence ----

export interface FunnelData {
  product_name: string;
  product_id: string;
  views: number;
  addToCart: number;
  purchases: number;
}

export interface FunnelGlobals {
  menuVisits: number;
  beginCheckout: number;
  /** Sessões únicas que tiveram pelo menos 1 view_item (qualquer produto). */
  viewItemSessions: number;
  /** Sessões únicas que tiveram pelo menos 1 add_to_cart (qualquer produto). */
  addToCartSessions: number;
  /** Sessões únicas que tiveram pelo menos 1 purchase (qualquer produto). */
  purchaseSessions: number;
}

export interface FunnelResult {
  perProduct: FunnelData[];
  globals: FunnelGlobals;
}

/**
 * Funil baseado em SESSÕES ÚNICAS (não em contagem bruta de eventos).
 * Múltiplos reloads/eventos da mesma session_id contam como 1 em cada etapa.
 *
 * Ignora eventos anteriores a FUNNEL_CUTOFF_ISO (data da migração para
 * o modelo visitor_id/session_id).
 */
export const getFunnelData = async (startDate: string, endDate: string): Promise<FunnelResult> => {
  const requestedStart = new Date(`${startDate}T00:00:00`).toISOString();
  // Garante que não consultamos antes do cutoff
  const startIso = requestedStart < FUNNEL_CUTOFF_ISO ? FUNNEL_CUTOFF_ISO : requestedStart;
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from('product_events' as any)
    .select('product_id, product_name, event_type, quantity, session_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .in('event_type', [
      'view_item',
      'add_to_cart',
      'purchase',
      'begin_checkout',
      'visita_cardapio_nova',
      'visita_cardapio_recorrente',
    ]);

  if (error || !data) {
    console.error('Error fetching funnel data:', error);
    return {
      perProduct: [],
      globals: {
        menuVisits: 0,
        beginCheckout: 0,
        viewItemSessions: 0,
        addToCartSessions: 0,
        purchaseSessions: 0,
      },
    };
  }

  // Globais: sessões únicas que tiveram cada evento (qualquer produto)
  const visitSessions = new Set<string>();
  const checkoutSessions = new Set<string>();
  const viewItemSessions = new Set<string>();
  const addToCartSessions = new Set<string>();
  const purchaseSessions = new Set<string>();

  // Por produto: sessões únicas por etapa + total de purchases (quantidade vendida real)
  const productInfo = new Map<string, { product_name: string }>();
  const viewSessionsByProduct = new Map<string, Set<string>>();
  const cartSessionsByProduct = new Map<string, Set<string>>();
  const purchaseSessionsByProduct = new Map<string, Set<string>>();
  const purchaseQtyByProduct = new Map<string, number>();

  const ensureProduct = (id: string, name: string) => {
    if (!productInfo.has(id)) productInfo.set(id, { product_name: name });
    if (!viewSessionsByProduct.has(id)) viewSessionsByProduct.set(id, new Set());
    if (!cartSessionsByProduct.has(id)) cartSessionsByProduct.set(id, new Set());
    if (!purchaseSessionsByProduct.has(id)) purchaseSessionsByProduct.set(id, new Set());
    if (!purchaseQtyByProduct.has(id)) purchaseQtyByProduct.set(id, 0);
  };

  (data as any[]).forEach((row: any) => {
    const sid = row.session_id || `__no_session__${row.product_id}__${row.event_type}`;

    if (row.event_type === 'visita_cardapio_nova' || row.event_type === 'visita_cardapio_recorrente') {
      visitSessions.add(sid);
      return;
    }
    if (row.event_type === 'begin_checkout') {
      checkoutSessions.add(sid);
      return;
    }

    const id = row.product_id;
    ensureProduct(id, row.product_name);

    if (row.event_type === 'view_item') {
      viewSessionsByProduct.get(id)!.add(sid);
      viewItemSessions.add(sid);
    } else if (row.event_type === 'add_to_cart') {
      cartSessionsByProduct.get(id)!.add(sid);
      addToCartSessions.add(sid);
    } else if (row.event_type === 'purchase') {
      purchaseSessionsByProduct.get(id)!.add(sid);
      purchaseQtyByProduct.set(id, purchaseQtyByProduct.get(id)! + (row.quantity ?? 1));
      purchaseSessions.add(sid);
    }
  });

  const perProduct: FunnelData[] = Array.from(productInfo.entries()).map(([id, info]) => ({
    product_id: id,
    product_name: info.product_name,
    views: viewSessionsByProduct.get(id)!.size,
    addToCart: cartSessionsByProduct.get(id)!.size,
    // Mantém quantidade real comprada (não sessões), pois é a métrica de venda
    purchases: purchaseQtyByProduct.get(id)!,
  })).sort((a, b) => b.views - a.views);

  return {
    perProduct,
    globals: {
      menuVisits: visitSessions.size,
      beginCheckout: checkoutSessions.size,
      viewItemSessions: viewItemSessions.size,
      addToCartSessions: addToCartSessions.size,
      purchaseSessions: purchaseSessions.size,
    },
  };
};

// ---- Visitas ao cardápio: breakdown novas/recorrentes + UTM ----

export interface VisitsBreakdown {
  total: number;
  novas: number;
  recorrentes: number;
  bySource: Array<{ key: string; count: number }>;
  byMedium: Array<{ key: string; count: number }>;
  byCampaign: Array<{ key: string; count: number }>;
  byContent: Array<{ key: string; count: number }>;
}

const NOT_SET_LABEL = '(não definido)';

export const getMenuVisitsBreakdown = async (
  startDate: string,
  endDate: string
): Promise<VisitsBreakdown> => {
  const requestedStart = new Date(`${startDate}T00:00:00`).toISOString();
  const startIso = requestedStart < FUNNEL_CUTOFF_ISO ? FUNNEL_CUTOFF_ISO : requestedStart;
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from('product_events' as any)
    .select('event_type, session_id, utm_source, utm_medium, utm_campaign, utm_content')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .in('event_type', ['visita_cardapio_nova', 'visita_cardapio_recorrente']);

  if (error || !data) {
    console.error('Error fetching menu visits breakdown:', error);
    return { total: 0, novas: 0, recorrentes: 0, bySource: [], byMedium: [], byCampaign: [], byContent: [] };
  }

  // Dedupe por session_id (uma sessão = uma visita)
  const seen = new Map<string, any>();
  (data as any[]).forEach((row) => {
    const sid = row.session_id || `__no_session__${Math.random()}`;
    // priorizar nova sobre recorrente se ambas existirem na mesma sessão
    if (!seen.has(sid) || row.event_type === 'visita_cardapio_nova') {
      seen.set(sid, row);
    }
  });

  const rows = Array.from(seen.values());
  const novas = rows.filter(r => r.event_type === 'visita_cardapio_nova').length;
  const recorrentes = rows.filter(r => r.event_type === 'visita_cardapio_recorrente').length;

  const tally = (field: string) => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = (r[field] as string) || NOT_SET_LABEL;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    total: rows.length,
    novas,
    recorrentes,
    bySource: tally('utm_source'),
    byMedium: tally('utm_medium'),
    byCampaign: tally('utm_campaign'),
    byContent: tally('utm_content'),
  };
};

// ---- Visualizações de produtos: breakdown por categoria + top produtos + iscas ----

export interface ProductViewsBreakdown {
  totalViews: number;
  topCategories: Array<{ category: string; views: number; pct: number }>;
  othersCategoryPct: number;
  topProducts: Array<{ product_id: string; product_name: string; views: number }>;
  iscas: Array<{ product_id: string; product_name: string; views: number; addToCart: number; conversionPct: number }>;
}

export const getProductViewsBreakdown = async (
  startDate: string,
  endDate: string
): Promise<ProductViewsBreakdown> => {
  const requestedStart = new Date(`${startDate}T00:00:00`).toISOString();
  const startIso = requestedStart < FUNNEL_CUTOFF_ISO ? FUNNEL_CUTOFF_ISO : requestedStart;
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from('product_events' as any)
    .select('product_id, product_name, category, event_type, session_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .in('event_type', ['view_item', 'add_to_cart']);

  if (error || !data) {
    console.error('Error fetching product views breakdown:', error);
    return { totalViews: 0, topCategories: [], othersCategoryPct: 0, topProducts: [], iscas: [] };
  }

  // Sessões únicas por (produto, evento) e por (categoria, evento view)
  const viewSessionsByProduct = new Map<string, Set<string>>();
  const cartSessionsByProduct = new Map<string, Set<string>>();
  const viewSessionsByCategory = new Map<string, Set<string>>();
  const productInfo = new Map<string, { name: string; category: string }>();

  (data as any[]).forEach((row) => {
    const sid = row.session_id || `__no_session__${row.product_id}__${row.event_type}__${Math.random()}`;
    const pid = row.product_id;
    const cat = row.category || '(sem categoria)';
    if (!productInfo.has(pid)) productInfo.set(pid, { name: row.product_name, category: cat });

    if (row.event_type === 'view_item') {
      if (!viewSessionsByProduct.has(pid)) viewSessionsByProduct.set(pid, new Set());
      viewSessionsByProduct.get(pid)!.add(sid);
      if (!viewSessionsByCategory.has(cat)) viewSessionsByCategory.set(cat, new Set());
      viewSessionsByCategory.get(cat)!.add(sid);
    } else if (row.event_type === 'add_to_cart') {
      if (!cartSessionsByProduct.has(pid)) cartSessionsByProduct.set(pid, new Set());
      cartSessionsByProduct.get(pid)!.add(sid);
    }
  });

  const totalViews = Array.from(viewSessionsByProduct.values()).reduce((sum, s) => sum + s.size, 0);
  const totalCategoryViews = Array.from(viewSessionsByCategory.values()).reduce((sum, s) => sum + s.size, 0);

  const allCategories = Array.from(viewSessionsByCategory.entries())
    .map(([category, set]) => ({ category, views: set.size }))
    .sort((a, b) => b.views - a.views);

  const top3 = allCategories.slice(0, 3).map(c => ({
    ...c,
    pct: totalCategoryViews > 0 ? (c.views / totalCategoryViews) * 100 : 0,
  }));
  const othersViews = allCategories.slice(3).reduce((sum, c) => sum + c.views, 0);
  const othersCategoryPct = totalCategoryViews > 0 ? (othersViews / totalCategoryViews) * 100 : 0;

  const productsWithViews = Array.from(viewSessionsByProduct.entries()).map(([pid, set]) => {
    const info = productInfo.get(pid)!;
    const views = set.size;
    const addToCart = cartSessionsByProduct.get(pid)?.size || 0;
    return {
      product_id: pid,
      product_name: info.name,
      views,
      addToCart,
      conversionPct: views > 0 ? (addToCart / views) * 100 : 0,
    };
  });

  const topProducts = [...productsWithViews]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map(({ product_id, product_name, views }) => ({ product_id, product_name, views }));

  const iscas = productsWithViews
    .filter(p => p.conversionPct < 40)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return { totalViews, topCategories: top3, othersCategoryPct, topProducts, iscas };
};

// ---- Carrinho (etapa 3): ticket médio + interação com cupons ----

export interface CartBreakdown {
  /** Sessões únicas que tiveram add_to_cart no período. */
  cartSessions: number;
  /** Ticket médio por sessão (soma de price*quantity dos add_to_cart por sessão, média). */
  avgCartTicket: number;
  /** Sessões únicas que tentaram aplicar um cupom. */
  couponAttemptSessions: number;
  /** Sessões únicas em que o cupom falhou (cupom inválido). */
  couponFailedSessions: number;
  /** Total bruto de tentativas (eventos). */
  totalAttempts: number;
  /** Total bruto de falhas (eventos). */
  totalFailures: number;
}

export const getCartStageBreakdown = async (
  startDate: string,
  endDate: string
): Promise<CartBreakdown> => {
  const requestedStart = new Date(`${startDate}T00:00:00`).toISOString();
  const startIso = requestedStart < FUNNEL_CUTOFF_ISO ? FUNNEL_CUTOFF_ISO : requestedStart;
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from('product_events' as any)
    .select('event_type, session_id, price, quantity')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .in('event_type', ['add_to_cart', 'coupon_attempt', 'coupon_failed']);

  if (error || !data) {
    console.error('Error fetching cart stage breakdown:', error);
    return {
      cartSessions: 0,
      avgCartTicket: 0,
      couponAttemptSessions: 0,
      couponFailedSessions: 0,
      totalAttempts: 0,
      totalFailures: 0,
    };
  }

  const cartTotalsBySession = new Map<string, number>();
  const couponAttemptSessions = new Set<string>();
  const couponFailedSessions = new Set<string>();
  let totalAttempts = 0;
  let totalFailures = 0;

  (data as any[]).forEach((row) => {
    const sid = row.session_id || `__no_session__${Math.random()}`;
    if (row.event_type === 'add_to_cart') {
      const value = (row.price ?? 0) * (row.quantity ?? 1);
      cartTotalsBySession.set(sid, (cartTotalsBySession.get(sid) || 0) + value);
    } else if (row.event_type === 'coupon_attempt') {
      couponAttemptSessions.add(sid);
      totalAttempts += 1;
    } else if (row.event_type === 'coupon_failed') {
      couponFailedSessions.add(sid);
      totalFailures += 1;
    }
  });

  const totals = Array.from(cartTotalsBySession.values());
  const avgCartTicket = totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;

  return {
    cartSessions: cartTotalsBySession.size,
    avgCartTicket,
    couponAttemptSessions: couponAttemptSessions.size,
    couponFailedSessions: couponFailedSessions.size,
    totalAttempts,
    totalFailures,
  };
};
