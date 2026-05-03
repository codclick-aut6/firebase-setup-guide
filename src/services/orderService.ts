import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Order, CreateOrderRequest, UpdateOrderRequest } from "@/types/order";
import { getAllVariations } from "@/services/variationService";
import { verificarFidelidade } from "@/services/fidelidadeService";

const ORDERS_COLLECTION = "orders";

// Remove `undefined` de objetos/arrays (Firestore não aceita undefined)
const removeUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value;

  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep).filter((v) => v !== undefined);
  }

  if (typeof value === "object") {
    const out: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      const cleaned = removeUndefinedDeep(val);
      if (cleaned !== undefined) out[key] = cleaned;
    });
    return out;
  }

  return value;
};

// Função para obter o preço adicional da variação
const getVariationPrice = async (variationId: string): Promise<number> => {
  try {
    const variations = await getAllVariations();
    const variation = variations.find((v) => v.id === variationId);
    return variation?.additionalPrice || 0;
  } catch (error) {
    console.error("Erro ao obter preço da variação:", error);
    return 0;
  }
};

// Criar um novo pedido
export const createOrder = async (
  orderData: CreateOrderRequest
): Promise<Order> => {
  try {
    console.log("=== CRIANDO PEDIDO ===");
    console.log(
      "Dados do pedido recebidos:",
      JSON.stringify(orderData, null, 2)
    );

    let total = 0;

    const orderItems = await Promise.all(
      orderData.items.map(async (item) => {
        console.log(`\n--- PROCESSANDO ITEM: ${item.name} ---`);
        console.log("Item original:", JSON.stringify(item, null, 2));

        const itemQty = item.quantity ?? 1;
        const isHalfPizza = !!item.isHalfPizza;

        // Preço base (sem adicionais/borda)
        const baseUnitPrice = isHalfPizza
          ? (item.combination?.price ?? item.price ?? 0)
          : (item.priceFrom ? 0 : (item.price ?? 0));

        let itemTotal = baseUnitPrice * itemQty;

        console.log(
          `Preço base: R$ ${baseUnitPrice} x ${itemQty} = R$ ${itemTotal}`
        );

        // Processar variações (inclui adicionais/borda para meio a meio)
        let processedVariations: any[] = [];
        if (item.selectedVariations && Array.isArray(item.selectedVariations)) {
          for (const group of item.selectedVariations) {
            const processedGroup = {
              groupId: group.groupId ?? null,
              groupName: group.groupName || group.groupId || "",
              variations: [] as any[],
            };

            if (group.variations && Array.isArray(group.variations)) {
              for (const variation of group.variations) {
                const variationAny = variation as any;
                const rawVariationId =
                  variation.variationId ??
                  variationAny.id ??
                  variationAny.variation_id ??
                  null;
                const variationId = rawVariationId ? String(rawVariationId) : null;

                let additionalPrice = variation.additionalPrice;
                if (additionalPrice === undefined && variationId) {
                  additionalPrice = await getVariationPrice(variationId);
                }
                additionalPrice = additionalPrice ?? 0;

                const variationQty = variation.quantity ?? 1;
                const halfSel = variationAny.halfSelection ?? null;
                const halfMultiplier =
                  isHalfPizza && halfSel === "whole" ? 2 : 1;

                const variationCost =
                  additionalPrice * variationQty * halfMultiplier * itemQty;

                if (variationCost > 0) {
                  itemTotal += variationCost;
                }

                processedGroup.variations.push({
                  variationId,
                  quantity: variationQty,
                  name: variation.name || "",
                  additionalPrice,
                  halfSelection: halfSel,
                });
              }
            }

            if (processedGroup.variations.length > 0) {
              processedVariations.push(processedGroup);
            }
          }
        }

        // Processar borda recheada
        const selectedBorder = (item as any).selectedBorder;
        if (selectedBorder && selectedBorder.additionalPrice > 0) {
          const borderCost = selectedBorder.additionalPrice * itemQty;
          itemTotal += borderCost;
          console.log(`Borda recheada: ${selectedBorder.name} +R$ ${borderCost}`);
        }

        total += itemTotal;

        return removeUndefinedDeep({
          menuItemId: item.menuItemId ?? (item as any).id ?? null,
          name: item.name,
          price: baseUnitPrice,
          quantity: itemQty,
          selectedVariations: processedVariations,
          priceFrom: item.priceFrom || false,
          isHalfPizza,
          combination: item.combination || null,
          selectedBorder: selectedBorder || null, // 🔥 salva borda recheada no item
          subtotal: itemTotal, // 🔥 salva subtotal no item
        });
      })
    );

    console.log("\n=== ITENS FINAIS DO PEDIDO ===");
    console.log(JSON.stringify(orderItems, null, 2));
    console.log(`Total final: R$ ${total}`);

    // Capturar o UID do usuário autenticado (Firebase Auth)
    const currentUserId = auth.currentUser?.uid ?? null;

    const orderToSave = removeUndefinedDeep({
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      userId: currentUserId, // 🔥 vincula pedido ao usuário autenticado
      address: orderData.address,
      bairro: orderData.bairro ?? "",
      cidade: orderData.cidade ?? "",
      paymentMethod: orderData.paymentMethod,
      observations: orderData.observations ?? "",
      items: orderItems,
      status: orderData.status ?? "pending",
      subtotal: orderData.subtotal ?? total,
      frete: orderData.frete ?? 0,
      total: orderData.total ?? total,
      discount: orderData.discount ?? 0,
      couponCode: orderData.couponCode ?? null,
      utm_source: orderData.utm_source ?? null,
      utm_medium: orderData.utm_medium ?? null,
      utm_campaign: orderData.utm_campaign ?? null,
      utm_content: orderData.utm_content ?? null,
      utm_term: orderData.utm_term ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderToSave);

    return {
      id: docRef.id,
      ...orderToSave,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Order;
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    throw error;
  }
};

// Obter um pedido pelo ID
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return null;

    const orderData = orderSnap.data() as Record<string, any>;
    return {
      id: orderSnap.id,
      ...orderData,
      createdAt: formatTimestamp(orderData.createdAt),
      updatedAt: formatTimestamp(orderData.updatedAt),
    } as Order;
  } catch (error) {
    console.error("Erro ao obter pedido:", error);
    throw error;
  }
};

// Obter pedidos por número de telefone
export const getOrdersByPhone = async (phone: string): Promise<Order[]> => {
  try {
    const ordersCollection = collection(db, ORDERS_COLLECTION);
    const q = query(
      ordersCollection,
      where("customerPhone", "==", phone),
      orderBy("createdAt", "desc")
    );

    const ordersSnapshot = await getDocs(q);
    return ordersSnapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Order;
    });
  } catch (error) {
    console.error("Erro ao obter pedidos por telefone:", error);
    throw error;
  }
};

// Obter todos os pedidos de hoje com filtro opcional de status
export const getTodayOrders = async (status?: string): Promise<Order[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const ordersCollection = collection(db, ORDERS_COLLECTION);
    let q;

    if (status && status !== "all") {
      q = query(
        ordersCollection,
        where("createdAt", ">=", todayTimestamp),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        ordersCollection,
        where("createdAt", ">=", todayTimestamp),
        orderBy("createdAt", "desc")
      );
    }

    const ordersSnapshot = await getDocs(q);

    let orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Order;
    });

    if (status && status !== "all") {
      orders = orders.filter((order) => order.status === status);
    }

    return orders;
  } catch (error) {
    console.error("Erro ao obter pedidos do dia:", error);
    throw error;
  }
};

// Nova função para obter pedidos por intervalo de datas e status opcional
export const getOrdersByDateRange = async (
  startDate: Date,
  endDate: Date,
  status?: string
): Promise<Order[]> => {
  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    const ordersCollection = collection(db, ORDERS_COLLECTION);

    const q = query(
      ordersCollection,
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp),
      orderBy("createdAt", "desc")
    );

    const ordersSnapshot = await getDocs(q);

    let orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Order;
    });

    if (status && status !== "all") {
      orders = orders.filter((order) => order.status === status);
    }

    return orders;
  } catch (error) {
    console.error("Erro ao obter pedidos por intervalo de datas:", error);
    throw error;
  }
};

// Atualizar um pedido
export const updateOrder = async (
  orderId: string,
  updates: UpdateOrderRequest
): Promise<Order | null> => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return null;

    const currentOrder = orderSnap.data() as Order;
    const previousStatus = currentOrder.status;

    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await updateDoc(orderRef, updateData);

    // Se o status mudou para "delivered", verificar fidelidade
    if (updates.status === "delivered" && previousStatus !== "delivered") {
      try {
        const customerName = currentOrder.customerName || "";
        const customerPhone = currentOrder.customerPhone || "";
        const items = currentOrder.items || [];

        if (customerPhone && items.length > 0) {
          console.log("🍕 Pedido entregue! Verificando fidelidade...");
          await verificarFidelidade(customerName, customerPhone, items);
        }
      } catch (fidelidadeError) {
        console.error("Erro ao verificar fidelidade na entrega:", fidelidadeError);
      }
    }

    return getOrderById(orderId);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    throw error;
  }
};

// Função auxiliar para formatar timestamps do Firestore
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === "string") return timestamp;

  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return new Date().toISOString();
};
