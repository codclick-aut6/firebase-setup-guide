
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useTracking } from "@/hooks/useTracking";
import AdminRoute from "@/components/AdminRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import Orders from "./pages/Orders";
import AdminOrders from "./pages/AdminOrders";
import Entregador from "./pages/Entregador";
import PDV from "./pages/PDV";
import Api from "./pages/Api";
import NotFound from "./pages/NotFound";
import ShoppingCart from "./components/ShoppingCart";

import Checkout from "./pages/Checkout";
import ForgotPassword from "./pages/ForgotPassword";
import AdminCupons from "@/pages/AdminCupons";
import MinhaEmpresa from "@/pages/MinhaEmpresa";
import Logistica from "@/pages/Logistica";
import MeusPedidos from "./pages/MeusPedidos";
import Fidelidade from "./pages/Fidelidade";
import Marketing from "./pages/Marketing";
import AdminMetrics from "./pages/AdminMetrics";
import AdminIntelligence from "./pages/AdminIntelligence";
import Configuracoes from "./pages/Configuracoes";
import LayoutPage from "./pages/Layout";
import Exportacoes from "./pages/Exportacoes";

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-full flex items-center justify-center">Carregando...</div>;
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  useTracking();
  
  // Routes where ShoppingCart and ChatAssistant should be hidden
  const adminRoutes = [
    '/admin-dashboard',
    '/admin',
    '/admin-orders',
    '/admin-metrics',
    '/entregador',
    '/pdv',
    '/admin-cupons',
    '/minha-empresa',
    '/logistica',
    '/fidelidade',
    '/marketing',
    '/configuracoes',
    '/admin-intelligence',
    '/layout',
    '/exportacoes'
  ];
  
  const isAdminPage = adminRoutes.some(route => location.pathname.startsWith(route));

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/meus-pedidos" element={<MeusPedidos />} />
        
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin-dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin-orders" element={
          <AdminRoute>
            <AdminOrders />
          </AdminRoute>
        } />
        <Route path="/entregador" element={
          <AdminRoute>
            <Entregador />
          </AdminRoute>
        } />
        <Route path="/pdv" element={
          <AdminRoute>
            <PDV />
          </AdminRoute>
        } />

        <Route path="/admin-cupons" element={
          <AdminRoute>
            <AdminCupons />
          </AdminRoute>
        } />

        <Route path="/minha-empresa" element={
          <AdminRoute>
            <MinhaEmpresa />
          </AdminRoute>
        } />

        <Route path="/logistica" element={
          <AdminRoute>
            <Logistica />
          </AdminRoute>
        } />
        <Route path="/fidelidade" element={
          <AdminRoute>
            <Fidelidade />
          </AdminRoute>
        } />
        <Route path="/marketing" element={
          <AdminRoute>
            <Marketing />
          </AdminRoute>
        } />
        <Route path="/admin-metrics" element={
          <AdminRoute>
            <AdminMetrics />
          </AdminRoute>
        } />
        <Route path="/admin-intelligence" element={
          <AdminRoute>
            <AdminIntelligence />
          </AdminRoute>
        } />
        <Route path="/configuracoes" element={
          <SuperAdminRoute>
            <Configuracoes />
          </SuperAdminRoute>
        } />
        <Route path="/layout" element={
          <AdminRoute>
            <LayoutPage />
          </AdminRoute>
        } />
        <Route path="/exportacoes" element={
          <AdminRoute>
            <Exportacoes />
          </AdminRoute>
        } />
        <Route path="/api/*" element={<Api />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminPage && <ShoppingCart />}
      
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
