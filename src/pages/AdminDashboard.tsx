
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ClipboardList, Settings, LogOut, Calculator, Bike, Percent, Building2, Truck, Gift, Megaphone, BarChart3, Paintbrush, Palette, Brain, Cog, Download } from "lucide-react";

const AdminDashboard = () => {
  const { currentUser, logOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const navigate = useNavigate();

  if (!currentUser) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Painel de Administração</h1>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={logOut} variant="outline" className="flex items-center gap-2">
            <LogOut size={16} />
            Sair
          </Button>
          {currentUser?.email && (
            <span className="text-xs text-muted-foreground">{currentUser.email}</span>
          )}
        </div>
      </div>
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Bem-vindo, Administrador!</h2>
        <p className="text-sm text-muted-foreground">
          Use este painel para gerenciar todos os aspectos do seu restaurante. 
          Você pode visualizar e atualizar pedidos, gerenciar o cardápio completo e acessar o sistema de PDV.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <ClipboardList className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Ver Pedidos</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin-orders">Acessar Pedidos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <Settings className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Gerenciamento do Cardápio</CardTitle>
            <CardDescription>
              Categorias, Itens, Variações e Grupos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin">Gerenciar Cardápio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Ponto de Venda</CardTitle>
            <CardDescription>
              Acesse o PDV para registrar pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/pdv">Acessar PDV</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
              <Percent className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Cupons de Desconto</CardTitle>
            <CardDescription>
              Crie, Edite e Exclua os cupons de desconto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin-cupons">Acessar Cupons</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
              <Bike className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Pedidos a Entregar</CardTitle>
            <CardDescription>
              Clique para checar os pedidos em rota de entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/entregador">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Minha Empresa</CardTitle>
            <CardDescription>
              Configure informações da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/minha-empresa">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <Truck className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Logística</CardTitle>
            <CardDescription>
              Configure valores de frete por quilometragem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/logistica">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Gift className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Programa de Fidelidade</CardTitle>
            <CardDescription>
              Configure recompensas para clientes fiéis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/fidelidade">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
              <Megaphone className="h-8 w-8 text-pink-600" />
            </div>
            <CardTitle className="text-xl">Marketing</CardTitle>
            <CardDescription>
             Configure as tags de rastreamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/marketing">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-teal-100 rounded-full w-fit">
              <BarChart3 className="h-8 w-8 text-teal-600" />
            </div>
            <CardTitle className="text-xl">Performance</CardTitle>
            <CardDescription>
              Acompanhe a performance do restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin-metrics">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-emerald-100 rounded-full w-fit">
              <Download className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Exportações</CardTitle>
            <CardDescription>
              Exporte dados do sistema em formato CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/exportacoes">Acessar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
              <Palette className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Layout da Loja</CardTitle>
            <CardDescription>
              Configure Nome, Descrição, Logo, Banner e Cores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/layout">Configurar</Link>
            </Button>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
                  <Brain className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Marketing Intelligence</CardTitle>
                <CardDescription>
                  Insights e análises avançadas de marketing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin-intelligence">Acessar</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-slate-100 rounded-full w-fit">
                  <Cog className="h-8 w-8 text-slate-600" />
                </div>
                <CardTitle className="text-xl">Sistema</CardTitle>
                <CardDescription>
                  Configurações avançadas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/configuracoes">Acessar</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
