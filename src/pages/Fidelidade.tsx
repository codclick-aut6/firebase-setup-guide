import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Gift, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FidelidadeRegra,
  ProdutoRefFid,
  getFidelidadeRegras,
  createFidelidadeRegra,
  updateFidelidadeRegra,
  deleteFidelidadeRegra,
} from "@/services/fidelidadeService";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import type { MenuItem, Category } from "@/types/menu";

type FormData = {
  nome: string;
  descricao: string;
  produto_tipo: "produto" | "categoria";
  produto_id: string;
  categoria_ids: string[];
  quantidade_necessaria: number;
  validade_dias: number;
  premio_tipo: "produto" | "categoria" | "cupom";
  premio_produto_id: string;
  premio_categoria_ids: string[];
  premio_cupom_tipo: "percentual" | "fixo" | "frete_gratis";
  premio_cupom_valor: number;
  premio_validade_dias: number;
  ativo: boolean;
};

const emptyForm: FormData = {
  nome: "",
  descricao: "",
  produto_tipo: "produto",
  produto_id: "",
  categoria_ids: [],
  quantidade_necessaria: 1,
  validade_dias: 0,
  premio_tipo: "cupom",
  premio_produto_id: "",
  premio_categoria_ids: [],
  premio_cupom_tipo: "percentual",
  premio_cupom_valor: 10,
  premio_validade_dias: 30,
  ativo: true,
};

const Fidelidade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [regras, setRegras] = useState<FidelidadeRegra[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<FidelidadeRegra | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [regraToDelete, setRegraToDelete] = useState<FidelidadeRegra | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    loadAll();
  }, [currentUser, navigate]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [r, items, cats] = await Promise.all([
        getFidelidadeRegras(),
        getAllMenuItems(),
        getAllCategories(),
      ]);
      setRegras(r);
      setMenuItems(items.filter((i) => i.available !== false));
      setCategories(cats);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as regras.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const nomeProduto = (id?: string) => menuItems.find((m) => m.id === id)?.name || "";
  const nomeCategoria = (id?: string) => categories.find((c) => c.id === id)?.name || "";

  const handleOpenDialog = (regra?: FidelidadeRegra) => {
    if (regra) {
      setEditingRegra(regra);
      setFormData({
        nome: regra.nome,
        descricao: regra.descricao || "",
        produto_tipo: regra.produto_requerido?.tipo || "produto",
        produto_id: regra.produto_requerido?.product_id || "",
        categoria_id:
          regra.produto_requerido?.category_ids?.[0] || regra.produto_requerido?.category_id || "",
        quantidade_necessaria: regra.quantidade_necessaria || 1,
        validade_dias: regra.validade_dias || 0,
        premio_tipo: regra.premio_tipo || "cupom",
        premio_produto_id: regra.premio_produto?.product_id || "",
        premio_categoria_id:
          regra.premio_produto?.category_ids?.[0] || regra.premio_produto?.category_id || "",
        premio_cupom_tipo: (regra.premio_cupom_tipo as any) || "percentual",
        premio_cupom_valor: regra.premio_cupom_valor ?? 10,
        premio_validade_dias: regra.premio_validade_dias ?? 30,
        ativo: regra.ativo,
      });
    } else {
      setEditingRegra(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const montarProdutoRef = (
    tipo: "produto" | "categoria",
    produtoId: string,
    categoriaId: string
  ): ProdutoRefFid => {
    if (tipo === "categoria") {
      return {
        tipo: "categoria",
        category_id: categoriaId,
        category_name: nomeCategoria(categoriaId),
        category_ids: categoriaId ? [categoriaId] : [],
        category_names: categoriaId ? [nomeCategoria(categoriaId)] : [],
      };
    }
    return { tipo: "produto", product_id: produtoId, product_name: nomeProduto(produtoId) };
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "Informe o nome da regra.", variant: "destructive" });
      return;
    }
    if (formData.produto_tipo === "produto" && !formData.produto_id) {
      toast({ title: "Erro", description: "Selecione o produto exigido.", variant: "destructive" });
      return;
    }
    if (formData.produto_tipo === "categoria" && !formData.categoria_id) {
      toast({ title: "Erro", description: "Selecione a categoria exigida.", variant: "destructive" });
      return;
    }
    if (formData.quantidade_necessaria < 1) {
      toast({ title: "Erro", description: "A quantidade necessária deve ser pelo menos 1.", variant: "destructive" });
      return;
    }
    if (formData.premio_tipo === "produto" && !formData.premio_produto_id) {
      toast({ title: "Erro", description: "Selecione o produto do prêmio.", variant: "destructive" });
      return;
    }
    if (formData.premio_tipo === "categoria" && !formData.premio_categoria_id) {
      toast({ title: "Erro", description: "Selecione a categoria do prêmio.", variant: "destructive" });
      return;
    }
    if (
      formData.premio_tipo === "cupom" &&
      formData.premio_cupom_tipo !== "frete_gratis" &&
      formData.premio_cupom_valor <= 0
    ) {
      toast({ title: "Erro", description: "Informe o valor do cupom de prêmio.", variant: "destructive" });
      return;
    }

    const produto_requerido = montarProdutoRef(
      formData.produto_tipo,
      formData.produto_id,
      formData.categoria_id
    );

    let premio_produto: ProdutoRefFid | null = null;
    if (formData.premio_tipo === "produto") {
      premio_produto = montarProdutoRef("produto", formData.premio_produto_id, "");
    } else if (formData.premio_tipo === "categoria") {
      premio_produto = montarProdutoRef("categoria", "", formData.premio_categoria_id);
    }

    const payload = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      produto_requerido,
      quantidade_necessaria: formData.quantidade_necessaria,
      validade_dias: formData.validade_dias,
      premio_tipo: formData.premio_tipo,
      premio_produto,
      premio_cupom_tipo: formData.premio_tipo === "cupom" ? formData.premio_cupom_tipo : null,
      premio_cupom_valor:
        formData.premio_tipo === "cupom"
          ? formData.premio_cupom_tipo === "frete_gratis"
            ? 0
            : formData.premio_cupom_valor
          : null,
      premio_validade_dias: formData.premio_validade_dias,
      ativo: formData.ativo,
    };

    try {
      if (editingRegra) {
        await updateFidelidadeRegra(editingRegra.id, payload);
        toast({ title: "Sucesso", description: "Regra atualizada!" });
      } else {
        await createFidelidadeRegra(payload);
        toast({ title: "Sucesso", description: "Regra criada!" });
      }
      setIsDialogOpen(false);
      loadAll();
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast({ title: "Erro", description: "Não foi possível salvar a regra.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!regraToDelete) return;
    try {
      await deleteFidelidadeRegra(regraToDelete.id);
      toast({ title: "Sucesso", description: "Regra excluída!" });
      setIsDeleteDialogOpen(false);
      setRegraToDelete(null);
      loadAll();
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      toast({ title: "Erro", description: "Não foi possível excluir a regra.", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (regra: FidelidadeRegra) => {
    try {
      await updateFidelidadeRegra(regra.id, { ativo: !regra.ativo });
      loadAll();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const descreverProduto = (ref: ProdutoRefFid | null): string => {
    if (!ref) return "—";
    if (ref.tipo === "categoria")
      return `Categoria: ${ref.category_names?.[0] || ref.category_name || "—"}`;
    return ref.product_name || "—";
  };

  const descreverPremio = (regra: FidelidadeRegra): string => {
    if (regra.premio_tipo === "cupom") {
      if (regra.premio_cupom_tipo === "frete_gratis") return "Cupom: frete grátis";
      if (regra.premio_cupom_tipo === "percentual") return `Cupom: ${regra.premio_cupom_valor}% off`;
      return `Cupom: R$ ${Number(regra.premio_cupom_valor || 0).toFixed(2)} off`;
    }
    return descreverProduto(regra.premio_produto);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Programa de Fidelidade</h1>
          <p className="text-muted-foreground">Configure regras de recompensa para seus clientes fiéis</p>
        </div>
      </div>

      <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Gift className="h-5 w-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <p className="font-medium mb-2">Comprando X PRODUTO dentro do prazo de Y dias, ganha PRÊMIO.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>PRODUTO</strong>: um produto específico ou qualquer item de uma categoria</li>
            <li><strong>X</strong>: quantidade de produtos necessária (contada por unidade comprada)</li>
            <li><strong>Y</strong>: prazo em dias (0 = sem validade, acúmulo por tempo indeterminado)</li>
            <li><strong>PRÊMIO</strong>: um produto, qualquer item de uma categoria ou um cupom de desconto</li>
            <li>As compras são cumulativas; ao atingir a meta, é gerado um cupom, enviado ao cliente e a contagem reinicia do zero</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : regras.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma regra de fidelidade cadastrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Produto (compra)</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra) => (
                  <TableRow key={regra.id}>
                    <TableCell>
                      <div className="font-medium">{regra.nome}</div>
                      {regra.descricao && (
                        <div className="text-sm text-muted-foreground">{regra.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>{descreverProduto(regra.produto_requerido)}</TableCell>
                    <TableCell>{regra.quantidade_necessaria}x</TableCell>
                    <TableCell>
                      {regra.validade_dias > 0 ? `${regra.validade_dias} dias` : "Sem validade"}
                    </TableCell>
                    <TableCell>{descreverPremio(regra)}</TableCell>
                    <TableCell>
                      <Switch checked={regra.ativo} onCheckedChange={() => handleToggleAtivo(regra)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(regra)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRegraToDelete(regra);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRegra ? "Editar Regra" : "Nova Regra"}</DialogTitle>
            <DialogDescription>Comprando X produto dentro de Y dias, ganha o prêmio.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome da regra *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Compre 10 pizzas e ganhe um refrigerante"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            {/* PRODUTO */}
            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-sm font-semibold">PRODUTO exigido</Label>
              <Select
                value={formData.produto_tipo}
                onValueChange={(v: "produto" | "categoria") =>
                  setFormData({ ...formData, produto_tipo: v, produto_id: "", categoria_id: "" })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="produto">Produto específico</SelectItem>
                  <SelectItem value="categoria">Qualquer item de uma categoria</SelectItem>
                </SelectContent>
              </Select>
              {formData.produto_tipo === "produto" ? (
                <Select
                  value={formData.produto_id}
                  onValueChange={(v) => setFormData({ ...formData, produto_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={formData.categoria_id}
                  onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade necessária (X) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantidade_necessaria}
                  onChange={(e) =>
                    setFormData({ ...formData, quantidade_necessaria: Math.max(1, Number(e.target.value)) })
                  }
                />
              </div>
              <div>
                <Label>Prazo Y (dias, 0 = sem validade)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.validade_dias}
                  onChange={(e) =>
                    setFormData({ ...formData, validade_dias: Math.max(0, Number(e.target.value)) })
                  }
                />
              </div>
            </div>

            {/* PRÊMIO */}
            <div className="rounded-lg border p-3 space-y-3">
              <Label className="text-sm font-semibold">PRÊMIO</Label>
              <Select
                value={formData.premio_tipo}
                onValueChange={(v: "produto" | "categoria" | "cupom") =>
                  setFormData({ ...formData, premio_tipo: v })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="produto">Produto específico (brinde)</SelectItem>
                  <SelectItem value="categoria">Item à escolha de uma categoria (brinde)</SelectItem>
                  <SelectItem value="cupom">Cupom de desconto</SelectItem>
                </SelectContent>
              </Select>

              {formData.premio_tipo === "produto" && (
                <Select
                  value={formData.premio_produto_id}
                  onValueChange={(v) => setFormData({ ...formData, premio_produto_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {formData.premio_tipo === "categoria" && (
                <Select
                  value={formData.premio_categoria_id}
                  onValueChange={(v) => setFormData({ ...formData, premio_categoria_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {formData.premio_tipo === "cupom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo do cupom</Label>
                    <Select
                      value={formData.premio_cupom_tipo}
                      onValueChange={(v: "percentual" | "fixo" | "frete_gratis") =>
                        setFormData({ ...formData, premio_cupom_tipo: v })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                        <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                        <SelectItem value="frete_gratis">Frete grátis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.premio_cupom_tipo !== "frete_gratis" && (
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.premio_cupom_valor}
                        onChange={(e) =>
                          setFormData({ ...formData, premio_cupom_valor: Math.max(0, Number(e.target.value)) })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Validade do prêmio (dias, 0 = sem validade)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.premio_validade_dias}
                  onChange={(e) =>
                    setFormData({ ...formData, premio_validade_dias: Math.max(0, Number(e.target.value)) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
              />
              <Label>Regra ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal excluir */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir regra</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a regra "{regraToDelete?.nome}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fidelidade;
