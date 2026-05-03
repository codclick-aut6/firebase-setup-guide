import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getOrdersByPhone } from "@/services/orderService";
import { Order } from "@/types/order";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { phoneVariants } from "@/utils/phoneUtils";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  delivering: "bg-purple-100 text-purple-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  received: "bg-emerald-100 text-emerald-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Em Produção",
  ready: "Pronto",
  delivering: "Em Entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
  received: "Recebido",
};

const MeusPedidos = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = async () => {
      try {
        // Buscar telefone do usuário
        const { data: userData } = await supabase
          .from("users")
          .select("phone")
          .eq("firebase_id", currentUser.uid)
          .maybeSingle();

        let phone = userData?.phone || currentUser.phoneNumber;

        if (!phone && currentUser.email) {
          const { data: customerData } = await supabase
            .from("customer_data")
            .select("phone")
            .eq("name", currentUser.displayName || currentUser.email)
            .maybeSingle();
          phone = customerData?.phone;
        }

        if (!phone) {
          setLoading(false);
          return;
        }

        // Gerar todas as variantes possíveis do telefone para buscar
        // (E.164, formatado, só dígitos, etc.) – cobre dados legados.
        const variants = phoneVariants(phone);
        if (variants.length === 0) {
          setLoading(false);
          return;
        }

        // Criar query para pedidos de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Firestore "in" suporta no máximo 30 valores
        const ordersQuery = query(
          collection(db, "orders"),
          where("customerPhone", "in", variants.slice(0, 30)),
          where("createdAt", ">=", todayTimestamp),
          orderBy("createdAt", "desc")
        );

        // Listener em tempo real
        unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
          const activeOrders = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              } as Order;
            })
            .filter((order) => !["delivered", "cancelled"].includes(order.status));

          setOrders(activeOrders);
          setLoading(false);
        }, (error) => {
          console.error("Erro no listener de pedidos:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error("Erro ao configurar listener:", error);
        setLoading(false);
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return format(date, "dd/MM/yyyy  -  HH:mm", { locale: ptBR });
  };

  const formatOrderId = (id: string) => {
    return id.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Meus Pedidos</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!currentUser ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Faça login para ver seus pedidos</h2>
            <p className="text-muted-foreground mb-4">
              Você precisa estar logado para acompanhar seus pedidos.
            </p>
            <Button onClick={() => navigate("/login")}>Fazer Login</Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nenhum pedido ativo</h2>
            <p className="text-muted-foreground mb-4">
              Você não possui pedidos em andamento no momento.
            </p>
            <Button onClick={() => navigate("/")}>Ver Cardápio</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Data e hora */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>

                  {/* ID do Pedido + Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-lg">
                      ID Pedido: {formatOrderId(order.id)}
                    </div>
                    <Badge className={statusColors[order.status] || "bg-muted text-muted-foreground"}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>

                  {/* Endereço */}
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{order.address}</span>
                  </div>

                  {/* Itens */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Itens:</div>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm text-muted-foreground border-b border-dashed pb-2 last:border-0">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-foreground">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-green-600 font-semibold">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          
                          {/* Variações/Adicionais */}
                          {item.selectedVariations && item.selectedVariations.length > 0 && (
                            <div className="ml-3 mt-1 space-y-0.5">
                              {item.selectedVariations.flatMap((group) =>
                                group.variations.map((v, vIndex) => (
                                  <div key={`${group.groupId}-${vIndex}`} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      + {v.name} {v.quantity && v.quantity > 1 ? `(x${v.quantity})` : ""}
                                    </span>
                                    {v.additionalPrice && v.additionalPrice > 0 && (
                                      <span className="text-green-600">
                                        +R$ {((v.additionalPrice || 0) * (v.quantity || 1) * item.quantity).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          
                          {/* Borda recheada */}
                          {(item as any).selectedBorder && (
                            <div className="ml-3 mt-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                + Borda: {(item as any).selectedBorder.name}
                              </span>
                              {(item as any).selectedBorder.additionalPrice > 0 && (
                                <span className="text-green-600">
                                  +R$ {((item as any).selectedBorder.additionalPrice * item.quantity).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Total */}
                  <div className="pt-3 border-t">
                    <div className="font-bold text-lg">
                      Total: R$ {order.total.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeusPedidos;
