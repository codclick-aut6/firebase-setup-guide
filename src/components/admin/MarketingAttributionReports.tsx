import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSalesBySource, fetchSalesByCampaign, fetchSalesByMedium, fetchSalesByContent, fetchSalesByTerm } from "@/services/salesAnalyticsService";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MarketingReportTable } from "./MarketingReportTable";

export function MarketingAttributionReports({ start, end }: { start: string; end: string }) {
  const [dimension, setDimension] = useState("source");
  const report = useQuery({ queryKey: ["marketing-attribution", start, end, dimension], staleTime: 60_000, queryFn: async () => {
    switch (dimension) {
      case "campaign": return (await fetchSalesByCampaign(start, end)).map(row => ({ id: row.campaign, label: row.campaign, quantity: row.orders, revenue: row.revenue, newCustomerPercent: row.newCustomerPercent, predominantProfile: row.predominantProfile, classifiedOrders: row.classifiedOrders }));
      case "medium": return (await fetchSalesByMedium(start, end)).map(row => ({ id: row.medium, label: row.medium, quantity: row.orders, revenue: row.revenue }));
      case "content": return (await fetchSalesByContent(start, end)).map(row => ({ id: row.content, label: row.content, quantity: row.orders, revenue: row.revenue }));
      case "term": return (await fetchSalesByTerm(start, end)).map(row => ({ id: row.term, label: row.term, quantity: row.orders, revenue: row.revenue }));
      default: return (await fetchSalesBySource(start, end)).map(row => ({ id: row.source, label: row.source === "(direto)" ? "Sem origem UTM registrada" : row.source, quantity: row.orders, revenue: row.revenue }));
    }
  } });
  return <section className="mt-8 space-y-4 border-t border-border pt-6">
    <div><h2 className="text-lg font-semibold">Atribuição das vendas · Pedidos</h2><p className="mt-1 text-xs text-muted-foreground">Até 10 maiores resultados por receita do período completo · busca e ordenação somente neste grupo · sem pedidos cancelados · independente dos filtros acima. Dimensões sem identificação UTM não aparecem, exceto em Origens.</p></div>
    <Tabs value={dimension} onValueChange={setDimension}><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="source">Origens</TabsTrigger><TabsTrigger value="campaign">Campanhas</TabsTrigger><TabsTrigger value="medium">Meios</TabsTrigger><TabsTrigger value="content">Conteúdos</TabsTrigger><TabsTrigger value="term">Termos</TabsTrigger></TabsList></Tabs>
    {report.isError ? <div className="flex items-center gap-3 text-sm"><p>Não foi possível carregar a atribuição das vendas.</p><Button variant="outline" onClick={() => report.refetch()}>Tentar novamente</Button></div> : <MarketingReportTable key={dimension} rows={report.data ?? []} loading={report.isLoading} campaignColumns={dimension === "campaign"} nameLabel="Identificação UTM" quantityLabel="Pedidos" revenueLabel="Receita" />}
  </section>;
}