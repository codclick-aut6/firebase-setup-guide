import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Plus, Pencil, Trash2, Gift, ShoppingCart, DollarSign } from "lucide-react";
import {
  FidelidadeRegra,
  getFidelidadeRegras,
  createFidelidadeRegra,
  updateFidelidadeRegra,
  deleteFidelidadeRegra,
} from "@/services/fidelidadeService";

const Fidelidade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [regras, setRegras] = useState<FidelidadeRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<FidelidadeRegra | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [regraToDelete, setRegraToDelete] = useState<FidelidadeRegra | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    criterio: "quantidade_compras" as "quantidade_compras" | "valor_gasto",
    meta: 0,
    premio_tipo: "cupom" as "cupom" | "produto",
    ativo: true,
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    loadRegras();
  }, [currentUser, navigate]);

  const loadRegras = async () => {
    try {
      setLoading(true);
      const data = await getFidelidadeRegras();
      setRegras(data);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as regras de fidelidade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (regra?: FidelidadeRegra) => {
    if (regra) {
      setEditingRegra(regra);
      setFormData({
        nome: regra.nome,
        descricao: regra.descricao || "",
        criterio: regra.criterio,
        meta: regra.meta,
        premio_tipo: regra.premio_tipo,
        ativo: regra.ativo,
      });
    } else {
      setEditingRegra(null);
      setFormData({
        nome: "",
        descricao: "",
        criterio: "quantidade_compras",
        meta: 0,
        premio_tipo: "cupom",
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.premio_tipo || formData.meta <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingRegra) {
        await updateFidelidadeRegra(editingRegra.id, {
          ...formData,
          premio_id: null,
        });
        toast({ title: "Sucesso", description: "Regra atualizada com sucesso!" });
      } else {
        await createFidelidadeRegra({
          ...formData,
          premio_id: null,
        });
        toast({ title: "Sucesso", description: "Regra criada com sucesso!" });
      }
      setIsDialogOpen(false);
      loadRegras();
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a regra.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!regraToDelete) return;

    try {
      await deleteFidelidadeRegra(regraToDelete.id);
      toast({ title: "Sucesso", description: "Regra excluída com sucesso!" });
      setIsDeleteDialogOpen(false);
      setRegraToDelete(null);
      loadRegras();
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a regra.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAtivo = async (regra: FidelidadeRegra) => {
    try {
      await updateFidelidadeRegra(regra.id, { ativo: !regra.ativo });
      loadRegras();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Programa de Fidelidade</h1>
          <p className="text-muted-foreground">
            Configure regras de recompensa para seus clientes fiéis
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Gift className="h-5 w-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <ul className="list-disc list-inside space-y-1">
            <li>Configure regras baseadas em <strong>número de compras</strong> ou <strong>valor total gasto</strong></li>
            <li>Quando um cliente atingir a meta, ele será avisado automaticamente</li>
            <li>Um código de cupom será gerado e enviado para o cliente, com a recompensa escolhida</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : regras.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma regra de fidelidade cadastrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Critério</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Recompensa</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra) => (
                  <TableRow key={regra.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{regra.nome}</div>
                        {regra.descricao && (
                          <div className="text-sm text-muted-foreground">{regra.descricao}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {regra.criterio === "quantidade_compras" ? (
                          <>
                            <ShoppingCart className="h-4 w-4 text-blue-500" />
                            <span>Nº de Compras</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span>Valor Gasto</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {regra.criterio === "quantidade_compras"
                        ? `${regra.meta} compras`
                        : `R$ ${regra.meta.toFixed(2)}`}
                    </TableCell>
                    <TableCell>{regra.premio_tipo}</TableCell>
                    <TableCell>
                      <Switch
                        checked={regra.ativo}
                        onCheckedChange={() => handleToggleAtivo(regra)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(regra)}
                        >
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegra ? "Editar Regra" : "Nova Regra de Fidelidade"}
            </DialogTitle>
            <DialogDescription>
              Configure os critérios e a recompensa para seus clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Regra *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Cliente VIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da regra"
              />
            </div>

            <div className="space-y-2">
              <Label>Critério *</Label>
              <Select
                value={formData.criterio}
                onValueChange={(value: "quantidade_compras" | "valor_gasto") =>
                  setFormData({ ...formData, criterio: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o critério" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantidade_compras">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Número de Compras
                    </div>
                  </SelectItem>
                  <SelectItem value="valor_gasto">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Total Gasto
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta">
                Meta * {formData.criterio === "quantidade_compras" ? "(quantidade)" : "(R$)"}
              </Label>
              <Input
                id="meta"
                type="number"
                min="1"
                step={formData.criterio === "valor_gasto" ? "0.01" : "1"}
                value={formData.meta}
                onChange={(e) =>
                  setFormData({ ...formData, meta: parseFloat(e.target.value) || 0 })
                }
                placeholder={formData.criterio === "quantidade_compras" ? "Ex: 10" : "Ex: 500.00"}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Recompensa *</Label>
              <Select
                value={formData.premio_tipo}
                onValueChange={(value: "cupom" | "produto") =>
                  setFormData({ ...formData, premio_tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cupom">Cupom de Desconto</SelectItem>
                  <SelectItem value="produto">Produto Grátis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Regra Ativa</Label>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingRegra ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a regra "{regraToDelete?.nome}"? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fidelidade;
