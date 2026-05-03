import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { subDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  ArrowLeft, Users, Eye, MousePointerClick, Clock, UserPlus, BarChart3,
  Globe, Timer, RefreshCw, Smartphone, Monitor, Tablet, ShoppingCart, Megaphone, DollarSign,
  ChevronLeft, ChevronRight, Package, Search, Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

import {
  fetchSnapshots, aggregateOverviews, buildDailyFromSnapshots,
  parseSourcesFromSnapshot, parseConversionTimeFromSnapshot,
  parseDayHourFromSnapshot, parseDevicesFromSnapshot,
  triggerSnapshot,
  type GA4SnapshotRow,
} from "@/services/ga4Service";
import {
  fetchSalesHeatmap, fetchSalesBySource, fetchSalesByCampaign, fetchItemPerformance,
  fetchCampaignDetail, fetchSourceDetail, fetchSalesByMedium, fetchSalesByContent, fetchSalesByTerm,
} from "@/services/salesAnalyticsService";
import { getFunnelData, getMenuVisitsBreakdown, type FunnelData } from "@/services/productEventService";
import { formatCurrency } from "@/lib/utils";

const dailyChartConfig: ChartConfig = {
  activeUsers: { label: "Usuários", color: "hsl(var(--primary))" },
  sessions: { label: "Sessões", color: "hsl(142, 76%, 36%)" },
  pageViews: { label: "Pageviews", color: "hsl(262, 83%, 58%)" },
};

const sourcesChartConfig: ChartConfig = {
  sessions: { label: "Sessões", color: "hsl(142, 76%, 36%)" },
};

const conversionChartConfig: ChartConfig = {
  avgSessionDuration: { label: "Duração Média (s)", color: "hsl(25, 95%, 53%)" },
  conversions: { label: "Conversões", color: "hsl(var(--primary))" },
};

const salesSourceChartConfig: ChartConfig = {
  revenue: { label: "Receita", color: "hsl(var(--primary))" },
  orders: { label: "Pedidos", color: "hsl(142, 76%, 36%)" },
};

const salesCampaignChartConfig: ChartConfig = {
  revenue: { label: "Receita", color: "hsl(262, 83%, 58%)" },
  orders: { label: "Pedidos", color: "hsl(25, 95%, 53%)" },
};

const salesMediumChartConfig: ChartConfig = {
  revenue: { label: "Receita", color: "hsl(340, 82%, 52%)" },
  orders: { label: "Pedidos", color: "hsl(200, 98%, 39%)" },
};

const salesContentChartConfig: ChartConfig = {
  revenue: { label: "Receita", color: "hsl(47, 100%, 47%)" },
  orders: { label: "Pedidos", color: "hsl(160, 84%, 39%)" },
};

const salesTermChartConfig: ChartConfig = {
  revenue: { label: "Receita", color: "hsl(280, 67%, 51%)" },
  orders: { label: "Pedidos", color: "hsl(14, 100%, 57%)" },
};

const SALES_HEATMAP_COLORS = {
  empty: "hsl(var(--muted))",
  low: "hsl(142, 76%, 36%, 0.2)",
  medium: "hsl(142, 76%, 36%, 0.45)",
  high: "hsl(142, 76%, 36%, 0.7)",
  max: "hsl(142, 76%, 36%)",
};

const DEVICE_COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(262, 83%, 58%)", "hsl(25, 95%, 53%)"];
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const AdminGA4 = () => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  const { data: allSnapshots, isLoading } = useQuery({
    queryKey: ["ga4-snapshots", startDate, endDate],
    queryFn: () => fetchSnapshots(startDate, endDate),
  });

  // Sales analytics queries
  const { data: salesHeatmapData } = useQuery({
    queryKey: ["sales-heatmap", startDate, endDate],
    queryFn: () => fetchSalesHeatmap(startDate, endDate),
  });

  const { data: salesBySourceData } = useQuery({
    queryKey: ["sales-by-source", startDate, endDate],
    queryFn: () => fetchSalesBySource(startDate, endDate),
  });

  const { data: salesByCampaignData } = useQuery({
    queryKey: ["sales-by-campaign", startDate, endDate],
    queryFn: () => fetchSalesByCampaign(startDate, endDate),
  });

  const { data: salesByMediumData } = useQuery({
    queryKey: ["sales-by-medium", startDate, endDate],
    queryFn: () => fetchSalesByMedium(startDate, endDate),
  });

  const { data: salesByContentData } = useQuery({
    queryKey: ["sales-by-content", startDate, endDate],
    queryFn: () => fetchSalesByContent(startDate, endDate),
  });

  const { data: salesByTermData } = useQuery({
    queryKey: ["sales-by-term", startDate, endDate],
    queryFn: () => fetchSalesByTerm(startDate, endDate),
  });

  const { data: itemPerformanceData } = useQuery({
    queryKey: ["item-performance", startDate, endDate],
    queryFn: () => fetchItemPerformance(startDate, endDate),
  });

  // Funnel data query
  const { data: funnelRawData } = useQuery({
    queryKey: ["funnel-data", startDate, endDate],
    queryFn: () => getFunnelData(startDate, endDate),
  });

  const [funnelProduct, setFunnelProduct] = useState<string>("all");
  const [visitsModalOpen, setVisitsModalOpen] = useState(false);

  const { data: visitsBreakdown, isLoading: isVisitsBreakdownLoading } = useQuery({
    queryKey: ["menu-visits-breakdown", startDate, endDate],
    queryFn: () => getMenuVisitsBreakdown(startDate, endDate),
    enabled: visitsModalOpen,
  });

  const funnelChartData = useMemo(() => {
    const items = funnelRawData?.perProduct || [];
    const globals = funnelRawData?.globals || {
      menuVisits: 0,
      beginCheckout: 0,
      viewItemSessions: 0,
      addToCartSessions: 0,
      purchaseSessions: 0,
    };
    let views = 0, addToCart = 0, purchases = 0;

    if (funnelProduct === "all") {
      // Totais globais = sessões únicas (uma sessão que viu 3 produtos conta 1x)
      views = globals.viewItemSessions;
      addToCart = globals.addToCartSessions;
      purchases = globals.purchaseSessions;
    } else {
      const item = items.find(i => i.product_id === funnelProduct);
      if (item) { views = item.views; addToCart = item.addToCart; purchases = item.purchases; }
    }

    const menuVisits = globals.menuVisits;
    const beginCheckout = globals.beginCheckout;

    const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
    const convTotal = pct(purchases, menuVisits || views);

    return {
      steps: [
        { name: "Visitas ao Cardápio", value: menuVisits, rate: 100, dropoff: 0 },
        { name: "Visualizações", value: views, rate: pct(views, menuVisits), dropoff: Math.max(menuVisits - views, 0) },
        { name: "Add ao Carrinho", value: addToCart, rate: pct(addToCart, views), dropoff: Math.max(views - addToCart, 0) },
        { name: "Início de Checkout", value: beginCheckout, rate: pct(beginCheckout, addToCart), dropoff: Math.max(addToCart - beginCheckout, 0) },
        { name: "Compras", value: purchases, rate: pct(purchases, beginCheckout), dropoff: Math.max(beginCheckout - purchases, 0) },
      ],
      convTotal,
    };
  }, [funnelRawData, funnelProduct]);

  // Products that have been sold (for funnel dropdown)
  const funnelProductOptions = useMemo(() => {
    return (funnelRawData?.perProduct || []).filter(i => i.purchases > 0);
  }, [funnelRawData]);

  const [itemPage, setItemPage] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  const { data: campaignDetailData, isLoading: isCampaignDetailLoading } = useQuery({
    queryKey: ["campaign-detail", startDate, endDate, selectedCampaign],
    queryFn: () => fetchCampaignDetail(startDate, endDate, selectedCampaign!),
    enabled: !!selectedCampaign,
  });

  const { data: sourceDetailData, isLoading: isSourceDetailLoading } = useQuery({
    queryKey: ["source-detail", startDate, endDate, selectedSource],
    queryFn: () => fetchSourceDetail(startDate, endDate, selectedSource!),
    enabled: !!selectedSource,
  });

  const paginatedItems = useMemo(() => {
    const items = itemPerformanceData || [];
    const totalQuantity = items.reduce((s, i) => s + i.quantitySold, 0);
    const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
    const start = itemPage * ITEMS_PER_PAGE;
    const page = items.slice(start, start + ITEMS_PER_PAGE);
    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    return { page, totalPages, totalQuantity, totalRevenue, totalItems: items.length };
  }, [itemPerformanceData, itemPage]);

  const overviewSnapshots = (allSnapshots || []).filter((s: GA4SnapshotRow) => s.report_type === 'overview');
  const sourcesSnapshots = (allSnapshots || []).filter((s: GA4SnapshotRow) => s.report_type === 'sources');
  const conversionSnapshots = (allSnapshots || []).filter((s: GA4SnapshotRow) => s.report_type === 'conversion_time');
  const dayHourSnapshots = (allSnapshots || []).filter((s: GA4SnapshotRow) => s.report_type === 'day_hour');
  const devicesSnapshots = (allSnapshots || []).filter((s: GA4SnapshotRow) => s.report_type === 'devices');

  const overview = aggregateOverviews(overviewSnapshots);
  const dailyData = buildDailyFromSnapshots(overviewSnapshots);

  // Merge sources across days
  const sourcesData = useMemo(() => {
    const map = new Map<string, { sessions: number; activeUsers: number }>();
    sourcesSnapshots.forEach((s: GA4SnapshotRow) => {
      parseSourcesFromSnapshot(s.data).forEach(row => {
        const existing = map.get(row.name) || { sessions: 0, activeUsers: 0 };
        map.set(row.name, {
          sessions: existing.sessions + row.sessions,
          activeUsers: existing.activeUsers + row.activeUsers,
        });
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [sourcesSnapshots]);

  // Merge conversion time data
  const conversionData = useMemo(() => {
    const map = new Map<string, { avgDuration: number; sessions: number; conversions: number; count: number }>();
    conversionSnapshots.forEach((s: GA4SnapshotRow) => {
      parseConversionTimeFromSnapshot(s.data).forEach(row => {
        const existing = map.get(row.source) || { avgDuration: 0, sessions: 0, conversions: 0, count: 0 };
        map.set(row.source, {
          avgDuration: existing.avgDuration + row.avgSessionDuration,
          sessions: existing.sessions + row.sessions,
          conversions: existing.conversions + row.conversions,
          count: existing.count + 1,
        });
      });
    });
    return Array.from(map.entries())
      .map(([source, v]) => ({
        source,
        avgSessionDuration: Math.round(v.avgDuration / v.count),
        sessions: v.sessions,
        conversions: v.conversions,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10);
  }, [conversionSnapshots]);

  // Build heatmap data: 7 days x 24 hours
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    dayHourSnapshots.forEach((s: GA4SnapshotRow) => {
      parseDayHourFromSnapshot(s.data).forEach(row => {
        if (row.dayOfWeek >= 0 && row.dayOfWeek < 7 && row.hour >= 0 && row.hour < 24) {
          grid[row.dayOfWeek][row.hour] += row.sessions;
        }
      });
    });
    const maxVal = Math.max(1, ...grid.flat());
    return { grid, maxVal };
  }, [dayHourSnapshots]);

  // Build sales heatmap: 7 days x 24 hours
  const salesHeatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    (salesHeatmapData || []).forEach(row => {
      if (row.dayOfWeek >= 0 && row.dayOfWeek < 7 && row.hour >= 0 && row.hour < 24) {
        grid[row.dayOfWeek][row.hour] += row.orders;
      }
    });
    const maxVal = Math.max(1, ...grid.flat());
    return { grid, maxVal };
  }, [salesHeatmapData]);

  // Merge devices data
  const devicesData = useMemo(() => {
    const map = new Map<string, { sessions: number; activeUsers: number }>();
    devicesSnapshots.forEach((s: GA4SnapshotRow) => {
      parseDevicesFromSnapshot(s.data).forEach(row => {
        const existing = map.get(row.device) || { sessions: 0, activeUsers: 0 };
        map.set(row.device, {
          sessions: existing.sessions + row.sessions,
          activeUsers: existing.activeUsers + row.activeUsers,
        });
      });
    });
    return Array.from(map.entries())
      .map(([device, v]) => ({ device, ...v }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [devicesSnapshots]);

  const totalDeviceSessions = devicesData.reduce((sum, d) => sum + d.sessions, 0);

  const snapshotMutation = useMutation({
    mutationFn: triggerSnapshot,
    onSuccess: () => {
      toast.success("Snapshot coletado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ga4-snapshots"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return "hsl(var(--muted))";
    const intensity = value / max;
    if (intensity < 0.25) return "hsl(var(--primary) / 0.2)";
    if (intensity < 0.5) return "hsl(var(--primary) / 0.4)";
    if (intensity < 0.75) return "hsl(var(--primary) / 0.65)";
    return "hsl(var(--primary))";
  };

  const getSalesHeatmapColor = (value: number, max: number) => {
    if (value === 0) return SALES_HEATMAP_COLORS.empty;
    const intensity = value / max;
    if (intensity < 0.25) return SALES_HEATMAP_COLORS.low;
    if (intensity < 0.5) return SALES_HEATMAP_COLORS.medium;
    if (intensity < 0.75) return SALES_HEATMAP_COLORS.high;
    return SALES_HEATMAP_COLORS.max;
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const hasGA4Data = (allSnapshots || []).length > 0;
  const hasSalesData = (salesHeatmapData || []).length > 0 || (salesBySourceData || []).length > 0 || (salesByCampaignData || []).length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/admin-dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Inteligência de Marketing</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => snapshotMutation.mutate()}
            disabled={snapshotMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${snapshotMutation.isPending ? 'animate-spin' : ''}`} />
            Coletar Snapshot
          </Button>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {!hasGA4Data ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-4 mb-8">
              <BarChart3 className="h-12 w-12" />
              <p className="text-lg">Nenhum snapshot GA4 encontrado neste período.</p>
              <p className="text-sm">Clique em "Coletar Snapshot" ou aguarde o cron diário.</p>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Usuários Ativos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{overview.activeUsers.toLocaleString("pt-BR")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Sessões</CardTitle>
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{overview.sessions.toLocaleString("pt-BR")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Pageviews</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{overview.pageViews.toLocaleString("pt-BR")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Taxa Rejeição</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{`${(overview.bounceRate * 100).toFixed(1)}%`}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Duração Média</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{formatDuration(overview.avgSessionDuration)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Novos Usuários</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{overview.newUsers.toLocaleString("pt-BR")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Chart */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Métricas Diárias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={dailyChartConfig} className="h-[300px] w-full">
                    <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="activeUsers" stroke="var(--color-activeUsers)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="pageViews" stroke="var(--color-pageViews)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Heatmap - Days x Hours */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Heatmap — Sessões por Dia e Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  {dayHourSnapshots.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                      Sem dados de dia/hora. Colete um novo snapshot.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="flex items-center gap-[2px] mb-[2px]">
                          <div className="w-10 shrink-0" />
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                              {String(h).padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                        {DAY_LABELS.map((dayLabel, dayIdx) => (
                          <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
                            <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium text-right pr-2">
                              {dayLabel}
                            </div>
                            {Array.from({ length: 24 }, (_, h) => {
                              const val = heatmapData.grid[dayIdx][h];
                              return (
                                <div
                                  key={h}
                                  className="flex-1 aspect-square rounded-sm cursor-default transition-colors"
                                  style={{ backgroundColor: getHeatmapColor(val, heatmapData.maxVal), minHeight: 18 }}
                                  title={`${dayLabel} ${String(h).padStart(2, '0')}h — ${val} sessões`}
                                />
                              );
                            })}
                          </div>
                        ))}
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <span className="text-[10px] text-muted-foreground">Menos</span>
                          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                            <div
                              key={intensity}
                              className="w-4 h-4 rounded-sm"
                              style={{
                                backgroundColor: intensity === 0
                                  ? "hsl(var(--muted))"
                                  : `hsl(var(--primary) / ${intensity < 0.5 ? intensity * 1.6 : intensity < 0.75 ? 0.65 : 1})`,
                              }}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground">Mais</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Fontes de Tráfego
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={sourcesChartConfig} className="h-[300px] w-full">
                      <BarChart data={sourcesData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Dispositivos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devicesData.length === 0 ? (
                      <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                        Sem dados de dispositivos. Colete um novo snapshot.
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={devicesData}
                              dataKey="sessions"
                              nameKey="device"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={40}
                              paddingAngle={3}
                              label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                              fontSize={12}
                            >
                              {devicesData.map((_, idx) => (
                                <Cell key={idx} fill={DEVICE_COLORS[idx % DEVICE_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full space-y-2">
                          {devicesData.map((d, idx) => (
                            <div key={d.device} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[idx % DEVICE_COLORS.length] }} />
                                {getDeviceIcon(d.device)}
                                <span className="capitalize">{d.device}</span>
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground">
                                <span>{d.sessions.toLocaleString("pt-BR")} sessões</span>
                                <span className="font-medium text-foreground">
                                  {totalDeviceSessions > 0 ? ((d.sessions / totalDeviceSessions) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Time */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Tempo até Conversão (por Fonte)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversionData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                      Sem dados de conversão no período
                    </div>
                  ) : (
                    <ChartContainer config={conversionChartConfig} className="h-[300px] w-full">
                      <BarChart data={conversionData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="source" fontSize={11} tickLine={false} axisLine={false} width={90} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avgSessionDuration" fill="var(--color-avgSessionDuration)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== SALES ANALYTICS SECTION (always visible, independent of GA4) ===== */}
          <div className="mt-10 mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Análise de Vendas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Dados de pedidos reais (Supabase)</p>
          </div>

          {/* Sales Heatmap */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Heatmap — Vendas por Dia e Horário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(salesHeatmapData || []).length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                  Sem dados de vendas no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex items-center gap-[2px] mb-[2px]">
                      <div className="w-10 shrink-0" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                    {DAY_LABELS.map((dayLabel, dayIdx) => (
                      <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
                        <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium text-right pr-2">
                          {dayLabel}
                        </div>
                        {Array.from({ length: 24 }, (_, h) => {
                          const val = salesHeatmap.grid[dayIdx][h];
                          return (
                            <div
                              key={h}
                              className="flex-1 aspect-square rounded-sm cursor-default transition-colors"
                              style={{ backgroundColor: getSalesHeatmapColor(val, salesHeatmap.maxVal), minHeight: 18 }}
                              title={`${dayLabel} ${String(h).padStart(2, '0')}h — ${val} pedidos`}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <span className="text-[10px] text-muted-foreground">Menos</span>
                      {[SALES_HEATMAP_COLORS.empty, SALES_HEATMAP_COLORS.low, SALES_HEATMAP_COLORS.medium, SALES_HEATMAP_COLORS.high, SALES_HEATMAP_COLORS.max].map((color, i) => (
                        <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">Mais</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales by Source */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Vendas por Origem (UTM Source)
                  </CardTitle>
                  {(salesBySourceData || []).length > 0 && (
                    <Select
                      value={selectedSource || ""}
                      onValueChange={(val) => setSelectedSource(val || null)}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Detalhar origem..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(salesBySourceData || []).map((s) => (
                          <SelectItem key={s.source} value={s.source}>
                            {s.source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(salesBySourceData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Sem dados de UTM. As vendas aparecerão aqui conforme pedidos com UTMs forem criados.
                  </div>
                ) : (
                  <ChartContainer config={salesSourceChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesBySourceData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="source" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales by Campaign */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="h-4 w-4" /> Vendas por Campanha
                  </CardTitle>
                  {(salesByCampaignData || []).length > 0 && (
                    <Select
                      value={selectedCampaign || ""}
                      onValueChange={(val) => setSelectedCampaign(val || null)}
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Detalhar campanha..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(salesByCampaignData || []).map((c) => (
                          <SelectItem key={c.campaign} value={c.campaign}>
                            {c.campaign}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(salesByCampaignData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Sem dados de campanhas. Adicione ?utm_campaign=nome nas URLs de campanhas.
                  </div>
                ) : (
                  <ChartContainer config={salesCampaignChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesByCampaignData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="campaign" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* UTM Medium / Content / Term */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Sales by Medium */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Vendas por Mídia (Medium)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(salesByMediumData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Sem dados de utm_medium no período.
                  </div>
                ) : (
                  <ChartContainer config={salesMediumChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesByMediumData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="medium" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales by Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Vendas por Conteúdo (Content)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(salesByContentData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Sem dados de utm_content no período.
                  </div>
                ) : (
                  <ChartContainer config={salesContentChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesByContentData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="content" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales by Term */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" /> Vendas por Termo (Term)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(salesByTermData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Sem dados de utm_term no período.
                  </div>
                ) : (
                  <ChartContainer config={salesTermChartConfig} className="h-[300px] w-full">
                    <BarChart data={salesByTermData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="term" fontSize={11} tickLine={false} axisLine={false} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaign Detail Modal */}
          <Dialog open={!!selectedCampaign} onOpenChange={(open) => { if (!open) setSelectedCampaign(null); }}>
            <DialogContent className="max-w-2xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Campanha: {selectedCampaign}
                </DialogTitle>
                <DialogDescription>
                  Produtos vendidos via esta campanha no período de {startDate} a {endDate}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                {isCampaignDetailLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (campaignDetailData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Nenhum item encontrado para esta campanha.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const items = campaignDetailData || [];
                        const totalQty = items.reduce((s, i) => s + i.quantitySold, 0);
                        const totalRev = items.reduce((s, i) => s + i.revenue, 0);
                        return (
                          <>
                            <TableRow className="bg-muted/30 font-semibold">
                              <TableCell></TableCell>
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{totalQty.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totalRev)}</TableCell>
                            </TableRow>
                            {items.map((item, idx) => (
                              <TableRow key={item.name}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantitySold.toLocaleString("pt-BR")}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Source Detail Modal */}
          <Dialog open={!!selectedSource} onOpenChange={(open) => { if (!open) setSelectedSource(null); }}>
            <DialogContent className="max-w-2xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Origem: {selectedSource}
                </DialogTitle>
                <DialogDescription>
                  Produtos vendidos via esta origem no período de {startDate} a {endDate}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                {isSourceDetailLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (sourceDetailData || []).length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Nenhum item encontrado para esta origem.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const items = sourceDetailData || [];
                        const totalQty = items.reduce((s, i) => s + i.quantitySold, 0);
                        const totalRev = items.reduce((s, i) => s + i.revenue, 0);
                        return (
                          <>
                            <TableRow className="bg-muted/30 font-semibold">
                              <TableCell></TableCell>
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{totalQty.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totalRev)}</TableCell>
                            </TableRow>
                            {items.map((item, idx) => (
                              <TableRow key={item.name}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantitySold.toLocaleString("pt-BR")}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Item Performance Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Desempenho por Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(itemPerformanceData || []).length === 0 ? (
                <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                  Sem dados de itens no período selecionado.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Nome do item</TableHead>
                          <TableHead className="text-right">Itens comprados</TableHead>
                          <TableHead className="text-right">Receita do item</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Totals row */}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell></TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">
                            {paginatedItems.totalQuantity.toLocaleString("pt-BR")}
                            <span className="text-muted-foreground text-xs ml-1">100%</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(paginatedItems.totalRevenue)}
                            <span className="text-muted-foreground text-xs ml-1">100%</span>
                          </TableCell>
                        </TableRow>
                        {paginatedItems.page.map((item, idx) => {
                          const rank = itemPage * ITEMS_PER_PAGE + idx + 1;
                          const qtyPct = paginatedItems.totalQuantity > 0
                            ? ((item.quantitySold / paginatedItems.totalQuantity) * 100).toFixed(2)
                            : "0";
                          const revPct = paginatedItems.totalRevenue > 0
                            ? ((item.revenue / paginatedItems.totalRevenue) * 100).toFixed(2)
                            : "0";
                          return (
                            <TableRow key={item.name}>
                              <TableCell className="text-muted-foreground">{rank}</TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-right">
                                {item.quantitySold.toLocaleString("pt-BR")}
                                <span className="text-muted-foreground text-xs ml-1">({qtyPct}%)</span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.revenue)}
                                <span className="text-muted-foreground text-xs ml-1">({revPct}%)</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {paginatedItems.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {itemPage * ITEMS_PER_PAGE + 1}–{Math.min((itemPage + 1) * ITEMS_PER_PAGE, paginatedItems.totalItems)} de {paginatedItems.totalItems} itens
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={itemPage === 0}
                          onClick={() => setItemPage(p => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          {itemPage + 1} / {paginatedItems.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={itemPage >= paginatedItems.totalPages - 1}
                          onClick={() => setItemPage(p => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Funil de Vendas */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" /> Funil de Vendas
                </CardTitle>
                <Select value={funnelProduct} onValueChange={setFunnelProduct}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Produtos</SelectItem>
                    {funnelProductOptions.map(p => (
                      <SelectItem key={p.product_id} value={p.product_id}>
                        {p.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {funnelChartData.steps[0].value === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados de funil para o período selecionado.</p>
              ) : (
                <div className="space-y-6">
                  {/* Funnel bars */}
                  <div className="space-y-3">
                    {funnelChartData.steps.map((step, idx) => {
                      const maxVal = funnelChartData.steps[0].value;
                      const widthPct = maxVal > 0 ? Math.max((step.value / maxVal) * 100, 4) : 0;
                      const colors = [
                        "hsl(var(--primary))",
                        "hsl(199, 89%, 48%)",
                        "hsl(25, 95%, 53%)",
                        "hsl(280, 65%, 55%)",
                        "hsl(142, 76%, 36%)",
                      ];
                      return (
                        <div key={step.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              Etapa {idx + 1}: {step.name}
                            </span>
                            <span className="text-muted-foreground">
                              {step.value.toLocaleString("pt-BR")}
                              {idx > 0 && (
                                <span className="ml-2 font-semibold" style={{ color: colors[idx] }}>
                                  {step.rate.toFixed(1)}%
                                </span>
                              )}
                            </span>
                          </div>
                          <div
                            className={`w-full bg-muted rounded-full h-8 overflow-hidden ${idx === 0 ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                            onClick={idx === 0 ? () => setVisitsModalOpen(true) : undefined}
                            title={idx === 0 ? "Ver detalhes das visitas" : undefined}
                          >
                            <div
                              className="h-full rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: colors[idx],
                                minWidth: step.value > 0 ? "40px" : "0px",
                              }}
                            >
                              {step.value > 0 && step.value.toLocaleString("pt-BR")}
                            </div>
                          </div>
                          {idx > 0 && step.dropoff > 0 && (
                            <p className="text-xs text-destructive">
                              Taxa de abandono: {step.dropoff.toLocaleString("pt-BR")} ({((step.dropoff / funnelChartData.steps[idx - 1].value) * 100).toFixed(1)}%)
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Conversion summary */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: "hsl(142, 76%, 36%)" }}>
                        {funnelChartData.convTotal.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Conversão Total</p>
                      <p className="text-xs text-muted-foreground">(Visita → Compra)</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={visitsModalOpen} onOpenChange={setVisitsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes das Visitas ao Cardápio</DialogTitle>
            <DialogDescription>
              Período: {startDate} até {endDate}
            </DialogDescription>
          </DialogHeader>

          {isVisitsBreakdownLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !visitsBreakdown || visitsBreakdown.total === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem visitas no período.</p>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{visitsBreakdown.total.toLocaleString("pt-BR")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Novas (novos usuários)</p>
                      <p className="text-2xl font-bold" style={{ color: "hsl(142, 76%, 36%)" }}>
                        {visitsBreakdown.novas.toLocaleString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Recorrentes</p>
                      <p className="text-2xl font-bold" style={{ color: "hsl(199, 89%, 48%)" }}>
                        {visitsBreakdown.recorrentes.toLocaleString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {([
                  { title: "Por utm_source", rows: visitsBreakdown.bySource },
                  { title: "Por utm_campaign", rows: visitsBreakdown.byCampaign },
                  { title: "Por utm_medium", rows: visitsBreakdown.byMedium },
                  { title: "Por utm_content", rows: visitsBreakdown.byContent },
                ]).map(({ title, rows }) => (
                  <div key={title}>
                    <h4 className="font-semibold mb-2">{title}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Valor</TableHead>
                          <TableHead className="text-right">Visitas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="font-medium">{r.key}</TableCell>
                            <TableCell className="text-right">{r.count.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGA4;
