import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, Users, Flame, Pizza } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import { getAllVariations } from "@/services/variationService";

const Exportacoes = () => {
  const { toast } = useToast();
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);

  const formatDateBR = (value: any) => {
    if (!value) return "";
    let d: Date;
    if (typeof value?.toDate === "function") {
      d = value.toDate();
    } else if (typeof value === "object" && "seconds" in value) {
      d = new Date(value.seconds * 1000);
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return "";
    let str: string;
    if (typeof value === "object") {
      try {
        str = JSON.stringify(value);
      } catch {
        str = String(value);
      }
    } else {
      str = String(value);
    }
    if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsv = (rows: string[], filename: string) => {
    const csvContent = rows.join("\r\n");
    // BOM UTF-8 para o Excel reconhecer acentos corretamente em PT-BR
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportUsers = async () => {
    setLoadingSupabase(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há clientes para exportar.",
        });
        setLoadingSupabase(false);
        return;
      }

      const headers = [
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        { key: "role", label: "Função" },
        { key: "created_at", label: "Criado em" },
        { key: "last_sign_in_at", label: "Último acesso" },
        { key: "firebase_id", label: "Firebase ID" },
        { key: "id", label: "ID" },
      ];

      const headerLine = headers.map((h) => escapeCsv(h.label)).join(";");
      const rows = data.map((row: any) =>
        headers
          .map((h) => {
            const value =
              h.key === "created_at" || h.key === "last_sign_in_at"
                ? formatDateBR(row[h.key])
                : row[h.key];
            return escapeCsv(value);
          })
          .join(";")
      );

      const today = new Date().toISOString().split("T")[0];
      downloadCsv([headerLine, ...rows], `clientes_supabase_${today}.csv`);

      toast({
        title: "Exportação concluída",
        description: `${data.length} cliente(s) exportado(s) com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro ao exportar clientes do Supabase:", err);
      toast({
        title: "Erro ao exportar",
        description: err.message || "Não foi possível exportar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoadingSupabase(false);
    }
  };

  const handleExportFirestoreUsers = async () => {
    setLoadingFirestore(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));

      if (snapshot.empty) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há clientes no Firestore para exportar.",
        });
        setLoadingFirestore(false);
        return;
      }

      // Coleta todas as chaves presentes em todos os documentos
      const allKeysSet = new Set<string>();
      const docs: Array<{ id: string; data: Record<string, any> }> = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Record<string, any>;
        docs.push({ id: doc.id, data });
        Object.keys(data).forEach((k) => allKeysSet.add(k));
      });

      // Mapeamento de rótulos amigáveis em PT-BR para campos comuns
      const labelMap: Record<string, string> = {
        name: "Nome",
        nome: "Nome",
        email: "E-mail",
        phone: "Telefone",
        telefone: "Telefone",
        whatsapp: "WhatsApp",
        role: "Função",
        createdAt: "Criado em",
        created_at: "Criado em",
        updatedAt: "Atualizado em",
        updated_at: "Atualizado em",
        lastSignInAt: "Último acesso",
        last_sign_in_at: "Último acesso",
        photoURL: "URL da Foto",
        uid: "UID",
      };

      const dateLikeKeys = new Set([
        "createdAt",
        "created_at",
        "updatedAt",
        "updated_at",
        "lastSignInAt",
        "last_sign_in_at",
      ]);

      const allKeys = Array.from(allKeysSet).sort();
      const headers = [
        { key: "__id", label: "ID do Documento" },
        ...allKeys.map((k) => ({ key: k, label: labelMap[k] || k })),
      ];

      const headerLine = headers.map((h) => escapeCsv(h.label)).join(";");
      const rows = docs.map(({ id, data }) =>
        headers
          .map((h) => {
            if (h.key === "__id") return escapeCsv(id);
            const raw = data[h.key];
            const value = dateLikeKeys.has(h.key) ? formatDateBR(raw) : raw;
            return escapeCsv(value);
          })
          .join(";")
      );

      const today = new Date().toISOString().split("T")[0];
      downloadCsv([headerLine, ...rows], `clientes_firestore_${today}.csv`);

      toast({
        title: "Exportação concluída",
        description: `${docs.length} cliente(s) do Firestore exportado(s) com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro ao exportar clientes do Firestore:", err);
      toast({
        title: "Erro ao exportar",
        description: err.message || "Não foi possível exportar os clientes do Firestore.",
        variant: "destructive",
      });
    } finally {
      setLoadingFirestore(false);
    }
  };

  // Escape para CSV separado por VÍRGULAS (compatível com import do Supabase)
  const escapeCsvComma = (value: unknown) => {
    if (value === null || value === undefined) return "";
    let str: string;
    if (typeof value === "object") {
      try {
        str = JSON.stringify(value);
      } catch {
        str = String(value);
      }
    } else {
      str = String(value);
    }
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsvComma = (rows: string[], filename: string) => {
    const csvContent = rows.join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMenuItems = async () => {
    setLoadingMenuItems(true);
    try {
      const [items, categories, variations] = await Promise.all([
        getAllMenuItems(),
        getAllCategories(),
        getAllVariations(),
      ]);

      if (!items || items.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há itens cadastrados para exportar.",
        });
        setLoadingMenuItems(false);
        return;
      }

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
      const variationMap = new Map(variations.map((v) => [v.id, v]));

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const headers = [
        "deeplink",
        "id",
        "nome",
        "descricao",
        "preco",
        "custo",
        "categoria_id",
        "categoria_nome",
        "categorias_adicionais_ids",
        "categorias_adicionais_nomes",
        "tipo_item",
        "permite_meio_a_meio",
        "max_sabores",
        "url_imagem",
        "produto_disponivel",
        "item_popular",
        "preco_a_partir_de",
        "frete_gratis",
        "grupos_variacoes",
        "variacoes",
        "mensagens_personalizadas",
      ];

      const headerLine = headers.map(escapeCsvComma).join(",");

      const rows = items.map((item) => {
        const additionalIds = item.additionalCategories || [];
        const additionalNames = additionalIds.map(
          (id) => categoryMap.get(id) || id
        );

        const variationGroups = (item.variationGroups || []).map((g) => ({
          id: g.id,
          name: g.name,
          internalName: g.internalName || "",
          minRequired: g.minRequired,
          maxAllowed: g.maxAllowed,
          customMessage: g.customMessage || "",
          applyToHalfPizza: !!g.applyToHalfPizza,
          allowPerHalf: !!g.allowPerHalf,
          variations: (g.variations || []).map((vid) => {
            const v = variationMap.get(vid);
            return v
              ? {
                  id: v.id,
                  name: v.name,
                  additionalPrice: v.additionalPrice ?? 0,
                  available: v.available !== false,
                }
              : { id: vid };
          }),
        }));

        const flatVariations = variationGroups.flatMap((g) =>
          g.variations.map((v: any) => v.name).filter(Boolean)
        );

        const customMessages = variationGroups
          .map((g) => g.customMessage)
          .filter((m) => m && m.trim() !== "");

        const row: Record<string, unknown> = {
          deeplink: origin ? `${origin}/?item=${item.id}` : `/?item=${item.id}`,
          id: item.id,
          nome: item.name,
          descricao: item.description,
          preco: item.price,
          custo: item.cost ?? "",
          categoria_id: item.category,
          categoria_nome: categoryMap.get(item.category) || "",
          categorias_adicionais_ids: JSON.stringify(additionalIds),
          categorias_adicionais_nomes: JSON.stringify(additionalNames),
          tipo_item: item.tipo || "padrao",
          permite_meio_a_meio: !!item.permiteCombinacao,
          max_sabores: item.maxSabores ?? "",
          url_imagem: item.image || "",
          produto_disponivel: item.available !== false,
          item_popular: !!item.popular,
          preco_a_partir_de: !!item.priceFrom,
          frete_gratis: !!item.freteGratis,
          grupos_variacoes: JSON.stringify(variationGroups),
          variacoes: JSON.stringify(flatVariations),
          mensagens_personalizadas: JSON.stringify(customMessages),
        };

        return headers.map((h) => escapeCsvComma(row[h])).join(",");
      });

      const today = new Date().toISOString().split("T")[0];
      downloadCsvComma([headerLine, ...rows], `itens_menu_${today}.csv`);

      toast({
        title: "Exportação concluída",
        description: `${items.length} item(s) exportado(s) com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro ao exportar itens do menu:", err);
      toast({
        title: "Erro ao exportar",
        description: err.message || "Não foi possível exportar os itens do menu.",
        variant: "destructive",
      });
    } finally {
      setLoadingMenuItems(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link to="/admin-dashboard" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Exportações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Exportar Clientes</CardTitle>
            <CardDescription>
              Baixe a lista completa de clientes (Supabase) em CSV compatível com Excel PT-BR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportUsers} disabled={loadingSupabase} className="w-full">
              <Download className="h-4 w-4" />
              {loadingSupabase ? "Exportando..." : "Exportar CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Exportar Clientes (Firestore)</CardTitle>
            <CardDescription>
              Baixe a coleção "users" do Firestore em CSV compatível com Excel PT-BR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportFirestoreUsers}
              disabled={loadingFirestore}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              {loadingFirestore ? "Exportando..." : "Exportar CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Pizza className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Exportar Itens do Menu</CardTitle>
            <CardDescription>
              Lista completa dos itens cadastrados (Firestore) em CSV separado por
              vírgulas, pronto para upload no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportMenuItems}
              disabled={loadingMenuItems}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              {loadingMenuItems ? "Exportando..." : "Exportar CSV"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Exportacoes;
