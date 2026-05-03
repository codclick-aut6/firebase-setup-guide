//checkout.tsx
import React, { useState, useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createOrder } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchAddressByCep } from "@/services/cepService";
import { saveCustomerData, getCustomerByPhone } from "@/services/customerService";
import { calculateFreteByCep } from "@/services/freteService";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ProductVariationDialog from "@/components/ProductVariationDialog";
import { getAllVariations } from "@/services/variationService";
import { CartItem, MenuItem, Variation, SelectedVariationGroup, PizzaBorder } from "@/types/menu";
import { trackPurchase, trackUpdateCheckoutQuantity } from "@/utils/trackingEvents";
import { getUtmParams } from "@/utils/utmCapture";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { phoneDigits as toPhoneDigits } from "@/utils/phoneUtils";
import { withComunicacaoMeta } from "@/utils/webhookPayload";

const Checkout = () => {
  const { cartItems, cartTotal, clearCart, removeFromCart, updateCartItemByIndex, appliedCoupon, discountAmount, finalTotal } = useCart();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [observations, setObservations] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [valorFrete, setValorFrete] = useState<number>(0);
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null);
  const [freteError, setFreteError] = useState<string | null>(null);
  const [freteCalculado, setFreteCalculado] = useState(false);
  
  // Verificar se algum item do carrinho tem frete grátis
  // Para pizza meio a meio, ambos os sabores precisam ter freteGratis
  const hasFreteGratis = (appliedCoupon?.tipo === "frete_gratis") || cartItems.some(item => {
    if (item.isHalfPizza) {
      return item.freteGratis === true;
    }
    return item.freteGratis === true;
  });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Estado para edição de item
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAvailableVariations, setEditAvailableVariations] = useState<Variation[]>([]);
  const [editGroupVariations, setEditGroupVariations] = useState<{ [groupId: string]: Variation[] }>({});
  
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Estado para detecção/atualização de número de telefone
  const [originalRegisteredPhone, setOriginalRegisteredPhone] = useState<string>("");
  const [phoneChangeDialogOpen, setPhoneChangeDialogOpen] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const pendingSubmitRef = useRef<null | (() => void)>(null);

  // Preencher dados automaticamente se o usuário estiver logado
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_id', currentUser.uid)
          .maybeSingle();

        const rawPhone =
          profile?.phone || currentUser.phoneNumber || "";
        const displayName =
          profile?.name || currentUser.displayName || "";

        setCustomerName(displayName);
        setCustomerPhone(rawPhone ? formatPhoneWithCountryCode(rawPhone) : "+55 ");
        setOriginalRegisteredPhone(rawPhone || "");

        if (rawPhone) {
          await loadSavedCustomerData(rawPhone);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        setCustomerName(currentUser.displayName || "");
        const rawPhone = currentUser.phoneNumber || "";
        setCustomerPhone(rawPhone ? formatPhoneWithCountryCode(rawPhone) : "+55 ");
        setOriginalRegisteredPhone(rawPhone || "");
        if (rawPhone) {
          await loadSavedCustomerData(rawPhone);
        }
      }
    };

    loadUserData();
  }, [currentUser]);

  // Função para carregar dados salvos do cliente
  const loadSavedCustomerData = async (phone: string) => {
    try {
      const customerData = await getCustomerByPhone(phone);
      if (customerData) {
        // Preencher os campos com os dados salvos apenas se estiverem vazios
        if (!customerName) setCustomerName(customerData.name || "");
        if (!cep) setCep(customerData.cep || "");
        if (!street) setStreet(customerData.street || "");
        if (!number) setNumber(customerData.number || "");
        if (!complement) setComplement(customerData.complement || "");
        if (!neighborhood) setNeighborhood(customerData.neighborhood || "");
        if (!city) setCity(customerData.city || "");
        if (!state) setState(customerData.state || "");

        // Recalcular frete quando o CEP vem preenchido automaticamente
        if (customerData.cep && customerData.cep.replace(/\D/g, "").length === 8) {
          try {
            await calculateFreteForCep(customerData.cep);
          } catch (freteErr: any) {
            console.error("Erro ao calcular frete automaticamente:", freteErr);
            const errorMsg = freteErr.message || "Não foi possível calcular o frete";
            setFreteError(errorMsg);
            toast({
              title: "Aviso",
              description: errorMsg,
              variant: "destructive",
            });
            setValorFrete(0);
            setDistanciaKm(null);
            setFreteCalculado(false);
          }
        }
        
      }
    } catch (error) {
      console.error("Erro ao buscar dados do cliente:", error);
    }
  };

  const formatPhoneWithCountryCode = (raw: string) => {
    // Sempre garante prefixo 55
    let digits = raw.replace(/\D/g, "");
    if (!digits.startsWith("55")) {
      digits = "55" + digits;
    }
    // Limita a 13 dígitos (55 + DDD2 + 9 dígitos)
    digits = digits.slice(0, 13);

    const country = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);

    let formatted = `+${country}`;
    if (ddd) formatted += ` (${ddd}`;
    if (ddd.length === 2) formatted += ")";
    if (rest.length > 0) {
      if (rest.length <= 4) {
        formatted += ` ${rest}`;
      } else if (rest.length <= 8) {
        // fixo: 4-4
        formatted += ` ${rest.slice(0, 4)}-${rest.slice(4)}`;
      } else {
        // mobile: 5-4
        formatted += ` ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
      }
    }
    return formatted;
  };

  const handlePhoneChange = async (value: string) => {
    const formatted = formatPhoneWithCountryCode(value);
    setCustomerPhone(formatted);

    // Buscar dados do cliente apenas quando o telefone estiver completo:
    // - 13 dígitos se o primeiro dígito do número (após 55+DD) for 9 (mobile)
    // - 12 dígitos caso contrário (fixo)
    const cleanPhone = formatted.replace(/\D/g, '');
    const firstSubscriberDigit = cleanPhone.charAt(4); // 55 + DD + [X]
    const isMobile = firstSubscriberDigit === "9";
    const complete = isMobile ? cleanPhone.length === 13 : cleanPhone.length === 12;
    if (complete) {
      setPhoneLoading(true);
      try {
        const customerData = await getCustomerByPhone(value);
        if (customerData) {
          // Preencher os campos com os dados salvos
          setCustomerName(customerData.name || "");
          setCep(customerData.cep || "");
          setStreet(customerData.street || "");
          setNumber(customerData.number || "");
          setComplement(customerData.complement || "");
          setNeighborhood(customerData.neighborhood || "");
          setCity(customerData.city || "");
          setState(customerData.state || "");

          // Recalcular frete quando o CEP é preenchido via busca pelo telefone
          if (customerData.cep && customerData.cep.replace(/\D/g, "").length === 8) {
            try {
              await calculateFreteForCep(customerData.cep);
            } catch (freteErr: any) {
              console.error("Erro ao calcular frete pelo telefone:", freteErr);
              const errorMsg = freteErr.message || "Não foi possível calcular o frete";
              setFreteError(errorMsg);
              toast({
                title: "Aviso",
                description: errorMsg,
                variant: "destructive",
              });
              setValorFrete(0);
              setDistanciaKm(null);
              setFreteCalculado(false);
            }
          }
          
        }
      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
      } finally {
        setPhoneLoading(false);
      }
    }
  };

  const calculateFreteForCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    console.log("calculateFreteForCep chamado com CEP:", cepValue, "| limpo:", cleanCep);
    
    if (cleanCep.length !== 8) {
      console.log("CEP inválido, saindo...");
      return;
    }

    // Limpar erro anterior
    setFreteError(null);

    console.log("Buscando dados da empresa...");
    
    // Buscar CEP da empresa (primeira empresa cadastrada)
    const { data: empresaData, error: empresaError } = await supabase
      .from("empresa_info")
      .select("cep, user_id")
      .limit(1)
      .maybeSingle();

    console.log("empresa_info resultado:", { empresaData, empresaError });

    if (empresaError) {
      console.error("Erro ao buscar empresa:", empresaError);
      throw empresaError;
    }

    if (!empresaData?.cep || !empresaData?.user_id) {
      console.error("Empresa sem CEP ou user_id:", empresaData);
      throw new Error("Empresa sem CEP configurado para cálculo de frete");
    }

    console.log("Chamando calculateFreteByCep com:", {
      cepCliente: cepValue,
      cepEmpresa: empresaData.cep,
      userId: empresaData.user_id
    });

    const freteData = await calculateFreteByCep(
      cepValue,
      empresaData.cep,
      empresaData.user_id
    );

    console.log("Resultado do frete:", freteData);

    setValorFrete(freteData.valorFrete);
    setDistanciaKm(freteData.distanciaKm);
    setFreteCalculado(true);

    // Mensagem personalizada baseada na origem do cálculo
    let descricao = `Frete: ${formatCurrency(freteData.valorFrete)}`;
    if (freteData.origem === "cep_especial") {
      descricao = `CEP especial - Frete: ${formatCurrency(freteData.valorFrete)}`;
    } else if (freteData.distanciaKm > 0) {
      descricao = `Distância: ${freteData.distanciaKm.toFixed(2)}km - Frete: ${formatCurrency(freteData.valorFrete)}`;
    }

  };

  const handleCepChange = async (value: string) => {
    setCep(value);

    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setValorFrete(0);
      setDistanciaKm(null);
      setFreteCalculado(false);
      return;
    }

    // Limpar número e focar no campo quando um novo CEP válido for inserido
    setNumber("");

    setCepLoading(true);
    try {
      // Buscar informações do endereço pelo CEP (se falhar, ainda tentamos calcular o frete)
      try {
        const cepInfo = await fetchAddressByCep(value);
        if (cepInfo) {
          setStreet(cepInfo.street || "");
          setNeighborhood(cepInfo.neighborhood || "");
          setCity(cepInfo.city || "");
          setState(cepInfo.state || "");
          
          // Focar no campo de número após buscar o endereço
          setTimeout(() => {
            numberInputRef.current?.focus();
          }, 100);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        toast({
          title: "Erro",
          description: "Não foi possível buscar as informações do CEP",
          variant: "destructive",
        });
      }

      try {
        await calculateFreteForCep(value);
      } catch (freteErr: any) {
        console.error("Erro ao calcular frete:", freteErr);
        const errorMsg = freteErr.message || "Não foi possível calcular o frete";
        setFreteError(errorMsg);
        toast({
          title: "Aviso",
          description: errorMsg,
          variant: "destructive",
        });
        setValorFrete(0);
        setDistanciaKm(null);
        setFreteCalculado(false);
      }
    } finally {
      setCepLoading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validação do telefone: código país 55 + DDD (2) + número (8 fixo / 9 mobile)
  // Se o primeiro dígito após o DDD for 9, é mobile e exige 13 dígitos no total
  const phoneDigits = customerPhone.replace(/\D/g, "");
  const isValidLength = phoneDigits.length === 12 || phoneDigits.length === 13;
  const firstSubscriberDigit = phoneDigits.charAt(4); // 55 + DD + [X]
  const isMobileStart = firstSubscriberDigit === "9";
  const mobileOk = !isMobileStart || phoneDigits.length === 13;

  if (!phoneDigits.startsWith("55") || !isValidLength || !mobileOk) {
    toast({
      title: "Telefone inválido",
      description: isMobileStart && phoneDigits.length !== 13
        ? "Números de celular (iniciados com 9) devem ter 13 dígitos. Ex: +55 (11) 91234-5678"
        : "Informe um número de WhatsApp brasileiro válido com DDD. Ex: +55 (11) 91234-5678",
      variant: "destructive",
    });
    return;
  }

  // Se o usuário está logado e mudou o número, pedir confirmação antes de prosseguir
  if (currentUser && originalRegisteredPhone) {
    const originalDigits = toPhoneDigits(originalRegisteredPhone).replace(/^55/, "");
    const currentDigits = phoneDigits.replace(/^55/, "");
    if (originalDigits && currentDigits && originalDigits !== currentDigits) {
      pendingSubmitRef.current = () => { void proceedWithOrder(); };
      setPhoneChangeDialogOpen(true);
      return;
    }
  }

  await proceedWithOrder();
};

const proceedWithOrder = async () => {
  setIsLoading(true);

  try {
    const fullAddress = `${street}, ${number}${complement ? `, ${complement}` : ""} - ${neighborhood}, ${city} - ${state}`;

    // Função auxiliar para calcular subtotal de cada item
    const calculateItemSubtotal = (item: any) => {
      if (item.isHalfPizza) {
        return (item.price || 0) * (item.quantity || 1);
      }

      const basePrice = (item.priceFrom ? 0 : (item.price || 0));
      let variationsTotal = 0;

      if (item.selectedVariations && Array.isArray(item.selectedVariations)) {
        item.selectedVariations.forEach((group: any) => {
          if (group.variations && Array.isArray(group.variations)) {
            group.variations.forEach((variation: any) => {
              const additionalPrice = variation.additionalPrice || 0;
              const quantity = variation.quantity || 1;
              // Para pizza meio a meio, "whole" cobra 2x o valor do adicional
              const halfMultiplier = variation.halfSelection === "whole" ? 2 : 1;
              variationsTotal += additionalPrice * quantity * halfMultiplier;
            });
          }
        });
      }

      return (basePrice + variationsTotal) * item.quantity;
    };

    // Montar itens já com subtotal
    const itemsWithSubtotal = cartItems.map(item => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      selectedVariations: item.selectedVariations || [],
      selectedBorder: item.selectedBorder || null,
      priceFrom: item.priceFrom || false,
      isHalfPizza: item.isHalfPizza || false,
      combination: item.combination || null,
      subtotal: calculateItemSubtotal(item), // 🔥 agora salva
    }));

    // Calcular total do pedido (incluindo frete, respeitando frete grátis)
    const subtotalPedido = itemsWithSubtotal.reduce((acc, item) => acc + item.subtotal, 0);
    const freteEfetivo = hasFreteGratis ? 0 : valorFrete;
    const totalComFrete = finalTotal + freteEfetivo;

    const utms = getUtmParams();

    const orderData = {
      customerName,
      customerPhone,
      address: fullAddress,
      bairro: neighborhood,
      cidade: city,
      paymentMethod,
      observations,
      items: itemsWithSubtotal,
      subtotal: finalTotal, // Subtotal com desconto mas sem frete
      frete: freteEfetivo, // Valor do frete (0 se frete grátis)
      total: totalComFrete, // Total com desconto e frete aplicados
      discount: discountAmount,
      couponCode: appliedCoupon?.nome ?? null,
      firebaseId: currentUser?.uid ?? null,
      userName: currentUser?.displayName ?? null,
      userEmail: currentUser?.email ?? null,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: utms.utm_content,
      utm_term: utms.utm_term,
    };

    console.log("[CHECKOUT] Dados do pedido sendo enviados:", JSON.stringify(orderData, null, 2));

    const order = await createOrder(orderData);

    // Salvar pedido no Supabase (pedidos_sabor_delivery) para analytics
    try {
      const { error: supaErr } = await supabase
        .from('pedidos_sabor_delivery' as any)
        .insert({
          firebase_id: order.id,
          codigo_pedido: order.id,
          codigo_curto: order.id.substring(0, 6).toUpperCase(),
          nome_cliente: customerName,
          telefone_cliente: customerPhone,
          endereco_entrega: fullAddress,
          metodo_pagamento: paymentMethod,
          observacoes: observations || null,
          valor_total: totalComFrete,
          status_atual: 'pending',
          cupom_desconto: appliedCoupon?.nome ?? null,
          origem: 'delivery',
          data_criacao: new Date().toISOString(),
          user_name: currentUser?.displayName ?? null,
          user_email: currentUser?.email ?? null,
          utm_source: utms.utm_source ?? null,
          utm_medium: utms.utm_medium ?? null,
          utm_campaign: utms.utm_campaign ?? null,
          utm_content: utms.utm_content ?? null,
          utm_term: utms.utm_term ?? null,
          itens: itemsWithSubtotal,
        } as any);
      if (supaErr) console.error('[CHECKOUT] Erro ao salvar no Supabase:', supaErr);
      else console.log('[CHECKOUT] Pedido salvo no Supabase com UTMs');
    } catch (e) {
      console.error('[CHECKOUT] Falha ao salvar pedido no Supabase:', e);
    }

    // Registrar uso do cupom via Edge Function (usa service role para bypass de RLS)
    if (appliedCoupon) {
      console.log("[CHECKOUT] Chamando Edge Function para registrar uso do cupom...");
      try {
        const { data: registroData, error: registroError } = await supabase.functions.invoke(
          "registrar-uso-cupom",
          {
            body: {
              cupom_id: appliedCoupon.id,
              firebase_id: currentUser?.uid || null,
              pedido_id: order.id,
            },
          }
        );

        if (registroError) {
          console.error("[CHECKOUT] Erro ao chamar Edge Function:", registroError);
        } else {
          console.log("[CHECKOUT] Resposta da Edge Function:", registroData);
          if (registroData?.atingiu_limite) {
            console.log("[CHECKOUT] Cupom atingiu limite e foi desativado automaticamente");
          }
        }
      } catch (fnError) {
        console.error("[CHECKOUT] Erro ao invocar Edge Function de cupom:", fnError);
      }
    }

    // Salvar dados do cliente após criar o pedido
    await saveCustomerData({
      name: customerName,
      phone: customerPhone,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    });

    // Salvar dados do usuário na coleção "user" do Firestore
    if (currentUser?.uid) {
      try {
        await setDoc(doc(db, "user", currentUser.uid), {
          nome: customerName,
          cep,
          rua: street,
          numero: number,
          bairro: neighborhood,
          cidade: city,
          estado: state,
          complemento: complement,
          updatedAt: new Date(),
        }, { merge: true });
        console.log("[CHECKOUT] Dados do usuário salvos no Firestore (coleção 'user')");
      } catch (firebaseErr) {
        console.error("[CHECKOUT] Erro ao salvar dados do usuário no Firestore:", firebaseErr);
      }
    }

    // Fidelidade será contabilizada apenas quando o pedido for entregue (status "delivered")

    // Track Purchase event
    try {
      trackPurchase({
        orderId: order.id,
        cartItems: [...cartItems], // copy before clearing
        total: totalComFrete,
        subtotal: subtotalPedido,
        frete: freteEfetivo,
        discount: discountAmount,
        couponCode: appliedCoupon?.nome ?? null,
        paymentMethod,
      });
    } catch (e) {
      console.error("Erro ao rastrear Purchase:", e);
    }

    clearCart();

    toast({
      title: "Pedido realizado com sucesso!",
      description: `Seu pedido #${order.id.substring(0, 6)} foi enviado para o restaurante.`,
    });

    navigate("/");
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    toast({
      title: "Erro",
      description: "Não foi possível processar seu pedido. Tente novamente.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
  };

  // === Atualização de número de telefone do cadastro ===

  const triggerWhatsappAuthWebhook = async (phone: string) => {
    try {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "webhook_autenticacao")
        .maybeSingle();
      const url = data?.valor;
      if (!url) {
        console.warn("Webhook de autenticação não configurado.");
        return false;
      }
      // Busca o id interno do usuário (tabela users) pelo firebase_id
      let userIdDb: string | null = null;
      if (currentUser?.uid) {
        const { data: u } = await supabase
          .from("users")
          .select("id")
          .eq("firebase_id", currentUser.uid)
          .maybeSingle();
        userIdDb = (u as any)?.id || null;
      }
      const enriched = await withComunicacaoMeta({
        phone,
        phone_cadastrado: originalRegisteredPhone || null,
        user_id: userIdDb,
        firebase_id: currentUser?.uid || null,
      });
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enriched),
      });
      return true;
    } catch (err) {
      console.error("Erro ao acionar webhook de autenticação:", err);
      return false;
    }
  };

  const updateRegisteredPhone = async (newPhone: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from("users")
        .update({ phone: newPhone })
        .eq("firebase_id", currentUser.uid);
      if (error) console.error("Erro ao atualizar telefone do usuário:", error);
    } catch (e) {
      console.error("Erro ao atualizar telefone:", e);
    }
  };

  const handleConfirmPhoneChange = async () => {
    setPhoneChangeDialogOpen(false);
    // Verifica se a verificação por WhatsApp está habilitada
    const { data: toggleData } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "whatsapp_verification_enabled")
      .maybeSingle();
    const verificationEnabled = toggleData?.valor !== "false";

    if (!verificationEnabled) {
      // Atualiza direto e prossegue
      await updateRegisteredPhone(customerPhone);
      setOriginalRegisteredPhone(customerPhone);
      toast({ title: "Número atualizado", description: "Seu WhatsApp foi atualizado no cadastro." });
      const next = pendingSubmitRef.current;
      pendingSubmitRef.current = null;
      next?.();
      return;
    }

    // Aciona webhook e abre OTP
    setSendingOtp(true);
    setOtpCode("");
    setOtpError("");
    const ok = await triggerWhatsappAuthWebhook(customerPhone);
    setSendingOtp(false);
    if (ok) {
      toast({ title: "Código enviado", description: "Enviamos um código de verificação para o seu WhatsApp." });
    } else {
      toast({
        title: "Atenção",
        description: "Não foi possível enviar o código. Verifique a configuração do webhook.",
        variant: "destructive",
      });
    }
    setOtpDialogOpen(true);
  };

  const handleCancelPhoneChange = () => {
    setPhoneChangeDialogOpen(false);
    // Restaurar número original e prosseguir com pedido
    setCustomerPhone(formatPhoneWithCountryCode(originalRegisteredPhone));
    const next = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    // Pequeno timeout para garantir o setState antes do submit
    setTimeout(() => next?.(), 0);
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otpCode.trim()) {
      setOtpError("Digite o código enviado para seu WhatsApp.");
      return;
    }
    setVerifyingOtp(true);
    try {
      // Procura o código pelo id do usuário logado
      if (!currentUser?.uid) {
        setOtpError("Usuário não identificado. Faça login novamente.");
        setVerifyingOtp(false);
        return;
      }
      const { data, error: dbError } = await supabase
        .from("users")
        .select("whatsapp_auth_code, id")
        .eq("firebase_id", currentUser.uid)
        .maybeSingle();

      if (dbError) throw dbError;

      const normalizedInput = otpCode.trim().toUpperCase();
      const savedCode = (data as any)?.whatsapp_auth_code?.trim().toUpperCase();
      if (savedCode && savedCode === normalizedInput) {
        await updateRegisteredPhone(customerPhone);
        setOriginalRegisteredPhone(customerPhone);
        setOtpDialogOpen(false);
        toast({
          title: "WhatsApp confirmado!",
          description: "Seu número foi atualizado no cadastro com sucesso.",
        });
        const next = pendingSubmitRef.current;
        pendingSubmitRef.current = null;
        next?.();
      } else {
        setOtpError("Código inválido. Verifique e tente novamente.");
      }
    } catch (err) {
      setOtpError("Não foi possível validar o código. Tente novamente.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    setOtpError("");
    const ok = await triggerWhatsappAuthWebhook(customerPhone);
    setSendingOtp(false);
    if (ok) toast({ title: "Código reenviado", description: "Verifique seu WhatsApp." });
  };


  const handleEditItem = async (index: number) => {
    const item = cartItems[index];
    if (!item.hasVariations || !item.variationGroups?.length) return;

    try {
      const allVariations = await getAllVariations();
      setEditAvailableVariations(allVariations);

      const groupVars: { [groupId: string]: Variation[] } = {};
      for (const group of item.variationGroups!) {
        // Respect the order defined in group.variations
        groupVars[group.id] = group.variations
          .map(varId => allVariations.find(v => v.id === varId))
          .filter((v): v is Variation => !!v && v.available);
      }
      setEditGroupVariations(groupVars);
      setEditingItemIndex(index);
      setEditDialogOpen(true);
    } catch (error) {
      console.error("Erro ao carregar variações para edição:", error);
    }
  };

  const handleEditConfirm = (
    _item: MenuItem & { quantity?: number },
    selectedVariationGroups: SelectedVariationGroup[],
    selectedBorder?: PizzaBorder | null
  ) => {
    if (editingItemIndex === null) return;
    const currentItem = cartItems[editingItemIndex];
    updateCartItemByIndex(editingItemIndex, {
      selectedVariations: selectedVariationGroups,
      selectedBorder: selectedBorder || undefined,
    });

    // Track checkout quantity/details update
    trackUpdateCheckoutQuantity({
      id: currentItem.id,
      name: currentItem.name,
      price: currentItem.price,
      quantity: currentItem.quantity,
      category: currentItem.category,
      variations: selectedVariationGroups?.flatMap(group =>
        group.variations.map(v => ({ name: v.name, price: v.additionalPrice }))
      ),
      border: selectedBorder
        ? { name: selectedBorder.name, price: selectedBorder.additionalPrice }
        : undefined,
      isHalfPizza: currentItem.isHalfPizza,
      combination: currentItem.combination,
    });

    setEditDialogOpen(false);
    setEditingItemIndex(null);
    toast({
      title: "Item atualizado",
      description: "As alterações foram aplicadas ao seu pedido.",
      duration: 2000,
    });
  };

  if (cartItems.length === 0) {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold mb-4">Seu carrinho está vazio</h2>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar ao cardápio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Finalizar Pedido</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customerPhone">Telefone/WhatsApp</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+55 (11) 91234-5678"
                  value={customerPhone}
                  onFocus={() => {
                    if (!customerPhone) setCustomerPhone("+55 ");
                  }}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={phoneLoading}
                  maxLength={20}
                  required
                />
                {phoneLoading && <p className="text-sm text-gray-500 mt-1">Buscando dados...</p>}
              </div>
              
              <div>
                <Label htmlFor="customerName">Nome completo</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <Separator />

              <h3 className="text-lg font-semibold">Endereço de Entrega</h3>
              
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  disabled={cepLoading}
                  required
                />
                {cepLoading && <p className="text-sm text-gray-500 mt-1">Buscando CEP...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    ref={numberInputRef}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, bloco, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label>Forma de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: "card" | "cash") => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Cartão</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix">PIX</Label>
                  </div>                 
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações sobre o pedido..."
                />
              </div>

              {freteError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm text-center">
                  {freteError}
                </div>
              )}

            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-0 border-b pb-4 mb-2 last:border-b-0 last:pb-0 relative group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{item.name}</p>
                      {item.isHalfPizza && item.combination ? (
                        <div className="text-sm text-gray-600">
                          <p>{item.quantity}x Pizza {item.combination.tamanho} - Meio a meio</p>
                          <p className="text-xs">1/2 {item.combination.sabor1.name} + 1/2 {item.combination.sabor2.name}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {item.quantity}x {item.priceFrom ? (
                            <span>
                              <span className="text-xs text-gray-500">a partir de</span> R$ 0,00
                            </span>
                          ) : (
                            `R$ ${item.price.toFixed(2)}`
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right font-semibold text-lg">
                        {/* Exibe apenas o preço base da pizza/item */}
                        R$ {(() => {
                          const baseUnitPrice = item.isHalfPizza
                            ? (item.price ?? 0)
                            : (item.priceFrom ? 0 : (item.price ?? 0));
                          return (baseUnitPrice * item.quantity).toFixed(2);
                        })()}
                      </div>
                      {!(item as any).__couponGiftId && item.hasVariations && item.variationGroups && item.variationGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleEditItem(index)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Editar item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {!(item as any).__couponGiftId && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exibir grupos de variações e suas quantidades/subtotais */}
                  {item.selectedVariations && item.selectedVariations.length > 0 && (
                    <div className="mt-2 ml-1 text-sm">
                      {item.selectedVariations.map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-2">
                          <div className="font-semibold text-muted-foreground">{group.groupName}:</div>
                          <div className="ml-2 text-muted-foreground flex flex-col gap-0.5">
                            {group.variations.map((variation, varIndex) => {
                              // Para pizza meio a meio com "whole", multiplica por 2
                              const halfMultiplier = item.isHalfPizza && variation.halfSelection === "whole" ? 2 : 1;
                              const displayQuantity = (variation.quantity || 1) * halfMultiplier;
                              const variationTotal =
                                (variation.additionalPrice || 0) *
                                displayQuantity *
                                item.quantity;

                              // Mostrar quantidade sempre, mesmo se for 1
                              if (variation.quantity > 0) {
                                return (
                                  <div key={varIndex} className="flex items-center justify-between">
                                    <span>
                                      <span className="inline-block w-7">{displayQuantity}x</span>
                                      {variation.name || "Variação"}
                                      {variation.additionalPrice && variation.additionalPrice > 0 ? (
                                        <>
                                          {" "}
                                          <span className="text-muted-foreground/70">
                                            (+R$ {variation.additionalPrice.toFixed(2)})
                                          </span>
                                        </>
                                      ) : null}
                                    </span>
                                    {/* Mostrar subtotal apenas se houver preço */}
                                    {variation.additionalPrice && variation.additionalPrice > 0 && (
                                      <span className="text-green-600 font-semibold tabular-nums">
                                        +R$ {(variationTotal).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Exibir borda recheada selecionada */}
                  {item.selectedBorder && (
                    <div className="mt-2 ml-1 text-sm">
                      <div className="font-semibold text-muted-foreground">Borda:</div>
                      <div className="ml-2 text-muted-foreground flex items-center justify-between">
                        <span>
                          {item.selectedBorder.name}
                          {item.selectedBorder.additionalPrice > 0 && (
                            <span className="text-muted-foreground/70 ml-1">
                              (+R$ {item.selectedBorder.additionalPrice.toFixed(2)})
                            </span>
                          )}
                        </span>
                        {item.selectedBorder.additionalPrice > 0 && (
                          <span className="text-green-600 font-semibold tabular-nums">
                            +R$ {(item.selectedBorder.additionalPrice * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtotal do item */}
                  <div className="flex justify-end mt-2 pt-2 border-t border-dashed">
                    <span className="text-sm font-semibold">
                      Subtotal: R$ {(() => {
                        const basePrice = item.isHalfPizza
                          ? (item.price ?? 0)
                          : (item.priceFrom ? 0 : (item.price ?? 0));
                        
                        let variationsTotal = 0;
                        if (item.selectedVariations && item.selectedVariations.length > 0) {
                          item.selectedVariations.forEach((group) => {
                            group.variations.forEach((variation) => {
                              const halfMultiplier = item.isHalfPizza && variation.halfSelection === "whole" ? 2 : 1;
                              const additionalPrice = variation.additionalPrice || 0;
                              const quantity = variation.quantity || 1;
                              variationsTotal += additionalPrice * quantity * halfMultiplier;
                            });
                          });
                        }
                        
                        // Adicionar valor da borda selecionada
                        const borderPrice = item.selectedBorder?.additionalPrice || 0;
                        
                        return ((basePrice + variationsTotal + borderPrice) * item.quantity).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-md">
                  <span>Subtotal:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-md text-green-600">
                    <span>Desconto ({appliedCoupon?.nome}):</span>
                    <span>- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {hasFreteGratis ? (
                  <div className="flex justify-between text-md text-green-600">
                    <span>Frete:</span>
                    <span>🚚 Grátis!</span>
                  </div>
                ) : valorFrete > 0 ? (
                  <div className="flex justify-between text-md">
                    <span>Frete:</span>
                    <span>R$ {valorFrete.toFixed(2)}</span>
                  </div>
                ) : null}
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>R$ {(finalTotal + (hasFreteGratis ? 0 : valorFrete)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            onClick={() => navigate("/")}
          >
            🍕 Adicionar mais itens
          </Button>

          <Button 
            className="w-full" 
            disabled={isLoading || !!freteError || (!freteCalculado && !hasFreteGratis)}
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
          >
            {isLoading ? "Processando..." : (!freteCalculado && !hasFreteGratis) ? "Informe o CEP para calcular o frete" : `Finalizar Pedido - ${formatCurrency(finalTotal + (hasFreteGratis ? 0 : valorFrete))}`}
          </Button>
        </div>
      </div>

      {/* Dialog de confirmação para deletar item */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item do seu pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  removeFromCart(itemToDelete);
                  setItemToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edição de item */}
      {editingItemIndex !== null && cartItems[editingItemIndex] && (
        <ProductVariationDialog
          item={cartItems[editingItemIndex]}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingItemIndex(null);
          }}
          onAddToCart={handleEditConfirm}
          availableVariations={editAvailableVariations}
          groupVariations={editGroupVariations}
          initialSelections={cartItems[editingItemIndex].selectedVariations}
          initialBorder={cartItems[editingItemIndex].selectedBorder}
          confirmLabel="Atualizar item"
        />
      )}

      {/* Dialog: confirmar atualização do número cadastrado */}
      <AlertDialog open={phoneChangeDialogOpen} onOpenChange={setPhoneChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar número de WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              O número informado <strong>{customerPhone}</strong> é diferente do que está no seu cadastro
              {originalRegisteredPhone ? <> (<strong>{formatPhoneWithCountryCode(originalRegisteredPhone)}</strong>)</> : null}.
              Deseja atualizar o seu cadastro com este novo número?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPhoneChange}>
              Não, manter o atual
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPhoneChange}>
              Sim, atualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: verificação por WhatsApp (OTP) */}
      <Dialog open={otpDialogOpen} onOpenChange={(open) => { if (!verifyingOtp) setOtpDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificação por WhatsApp</DialogTitle>
            <DialogDescription>
              Enviamos um código de verificação para <strong>{customerPhone}</strong>.
              Digite o código abaixo para confirmar a atualização do seu número.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Código de verificação"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              autoFocus
            />
            {otpError && <p className="text-sm text-destructive">{otpError}</p>}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={sendingOtp}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {sendingOtp ? "Enviando..." : "Reenviar código"}
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtpDialogOpen(false)} disabled={verifyingOtp}>
              Cancelar
            </Button>
            <Button onClick={handleVerifyOtp} disabled={verifyingOtp}>
              {verifyingOtp ? "Validando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
