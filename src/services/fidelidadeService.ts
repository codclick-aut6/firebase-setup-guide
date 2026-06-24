import { supabase } from "@/integrations/supabase/client";

export interface FidelidadeRegra {
  id: string;
  nome: string;
  descricao: string | null;
  criterio: "quantidade_compras" | "valor_gasto";
  meta: number;
  premio_tipo: "cupom" | "produto";
  premio_id: string | null;
  ativo: boolean;
  criado_em: string | null;
}

export interface FidelidadeHistorico {
  id: string;
  user_id: string | null;
  regra_id: string | null;
  data: string | null;
  premio_concedido: boolean;
  observacao: string | null;
}

// Buscar todas as regras de fidelidade
export const getFidelidadeRegras = async (): Promise<FidelidadeRegra[]> => {
  const { data, error } = await supabase
    .from("fidelidade_regras")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar regras de fidelidade:", error);
    throw error;
  }

  return (data || []).map((regra) => ({
    ...regra,
    criterio: regra.criterio as "quantidade_compras" | "valor_gasto",
    premio_tipo: regra.premio_tipo as "cupom" | "produto",
    ativo: regra.ativo ?? true,
  }));
};

// Buscar regras ativas
export const getRegrasAtivas = async (): Promise<FidelidadeRegra[]> => {
  const { data, error } = await supabase
    .from("fidelidade_regras")
    .select("*")
    .eq("ativo", true);

  if (error) {
    console.error("Erro ao buscar regras ativas:", error);
    throw error;
  }

  return (data || []).map((regra) => ({
    ...regra,
    criterio: regra.criterio as "quantidade_compras" | "valor_gasto",
    premio_tipo: regra.premio_tipo as "cupom" | "produto",
    ativo: regra.ativo ?? true,
  }));
};

// Criar nova regra
export const createFidelidadeRegra = async (
  regra: Omit<FidelidadeRegra, "id" | "criado_em">
): Promise<FidelidadeRegra> => {
  const { data, error } = await supabase
    .from("fidelidade_regras")
    .insert({
      nome: regra.nome,
      descricao: regra.descricao,
      criterio: regra.criterio,
      meta: regra.meta,
      premio_tipo: regra.premio_tipo,
      premio_id: regra.premio_id,
      ativo: regra.ativo,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar regra de fidelidade:", error);
    throw error;
  }

  return {
    ...data,
    criterio: data.criterio as "quantidade_compras" | "valor_gasto",
    premio_tipo: data.premio_tipo as "cupom" | "produto",
    ativo: data.ativo ?? true,
  };
};

// Atualizar regra
export const updateFidelidadeRegra = async (
  id: string,
  regra: Partial<FidelidadeRegra>
): Promise<FidelidadeRegra> => {
  const { data, error } = await supabase
    .from("fidelidade_regras")
    .update({
      nome: regra.nome,
      descricao: regra.descricao,
      criterio: regra.criterio,
      meta: regra.meta,
      premio_tipo: regra.premio_tipo,
      premio_id: regra.premio_id,
      ativo: regra.ativo,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar regra de fidelidade:", error);
    throw error;
  }

  return {
    ...data,
    criterio: data.criterio as "quantidade_compras" | "valor_gasto",
    premio_tipo: data.premio_tipo as "cupom" | "produto",
    ativo: data.ativo ?? true,
  };
};

// Excluir regra
export const deleteFidelidadeRegra = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("fidelidade_regras")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir regra de fidelidade:", error);
    throw error;
  }
};

// Verificar se um item é pizza de 8+ pedaços (elegível para fidelidade)
export const isPizzaElegivel = (item: any): boolean => {
  const nomeLower = String(item?.name ?? item?.nome ?? "").toLowerCase();
  const descLower = String(item?.description ?? item?.descricao ?? "").toLowerCase();
  const tipoLower = String(item?.tipo ?? item?.type ?? "").toLowerCase();

  // Estruturas possíveis:
  // - Checkout/cart: item.selectedVariations[{ groupName, variations[{ name }] }]
  // - Outros: item.variations / item.variacoes (legado)
  const grupos =
    item?.selectedVariations ?? item?.variations ?? item?.variacoes ?? ([] as any[]);

  let variacaoTexto = "";

  if (Array.isArray(grupos)) {
    for (const grupo of grupos) {
      const groupName = String(
        grupo?.groupName ?? grupo?.group ?? grupo?.grupo ?? grupo?.name ?? ""
      ).toLowerCase();

      if (groupName) variacaoTexto += ` ${groupName}`;

      // Dentro do grupo pode ser `variations` (Checkout) ou `options/opcoes` (legado)
      const opcoes =
        grupo?.variations ?? grupo?.options ?? grupo?.opcoes ?? ([] as any[]);

      if (Array.isArray(opcoes)) {
        for (const opcao of opcoes) {
          const opcaoNome = String(opcao?.name ?? opcao?.nome ?? "").toLowerCase();
          if (opcaoNome) variacaoTexto += ` ${opcaoNome}`;
        }
      }
    }
  }

  const textoCompleto = `${nomeLower} ${descLower} ${variacaoTexto}`;

  // Verifica se é pizza
  const isPizza = tipoLower === "pizza" || textoCompleto.includes("pizza");

  // Verifica se tem 8 ou mais pedaços
  const tem8OuMais = /grande|gigante|\b8\s*(pedaços|pedacos|fatias)|\b12\s*(pedaços|pedacos|fatias)/.test(
    textoCompleto
  );

  console.log(`🍕 Verificando item: ${item?.name || item?.nome || "(sem nome)"}`,
    { isPizza, tem8OuMais, textoCompleto }
  );

  return isPizza && tem8OuMais;
};

// Buscar ou criar progresso do cliente
export const getClienteProgresso = async (
  phone: string
): Promise<{ contagem: number; valorGasto: number }> => {
  const { data, error } = await supabase
    .from("fidelidade_progresso")
    .select("contagem_pizzas, valor_gasto_pizzas")
    .eq("telefone_cliente", phone)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar progresso:", error);
    return { contagem: 0, valorGasto: 0 };
  }

  return {
    contagem: data?.contagem_pizzas || 0,
    valorGasto: data?.valor_gasto_pizzas || 0,
  };
};

// Atualizar progresso do cliente
export const atualizarProgresso = async (
  phone: string,
  nome: string,
  pizzasNovas: number,
  valorNovas: number
): Promise<void> => {
  const { data: existing } = await supabase
    .from("fidelidade_progresso")
    .select("id, contagem_pizzas, valor_gasto_pizzas")
    .eq("telefone_cliente", phone)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("fidelidade_progresso")
      .update({
        contagem_pizzas: existing.contagem_pizzas + pizzasNovas,
        valor_gasto_pizzas: Number(existing.valor_gasto_pizzas) + valorNovas,
        nome_cliente: nome,
        ultima_atualizacao: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("fidelidade_progresso").insert({
      telefone_cliente: phone,
      nome_cliente: nome,
      contagem_pizzas: pizzasNovas,
      valor_gasto_pizzas: valorNovas,
    });
  }
};

// Ajustar progresso após atingir meta (mantém o excedente)
export const ajustarProgressoAposMeta = async (
  phone: string,
  meta: number,
  criterio: string
): Promise<void> => {
  const { data: existing } = await supabase
    .from("fidelidade_progresso")
    .select("id, contagem_pizzas, valor_gasto_pizzas")
    .eq("telefone_cliente", phone)
    .maybeSingle();

  if (!existing) return;

  let novaContagem = existing.contagem_pizzas;
  let novoValor = Number(existing.valor_gasto_pizzas);

  if (criterio === "quantidade_compras") {
    // Ex: tinha 11 pizzas, meta 10 → fica 1
    novaContagem = existing.contagem_pizzas % meta;
  } else if (criterio === "valor_gasto") {
    // Ex: gastou R$ 550, meta R$ 500 → fica R$ 50
    novoValor = novoValor % meta;
  }

  await supabase
    .from("fidelidade_progresso")
    .update({
      contagem_pizzas: novaContagem,
      valor_gasto_pizzas: novoValor,
      ultima_atualizacao: new Date().toISOString(),
    })
    .eq("id", existing.id);

  console.log(`🔄 Progresso ajustado: ${existing.contagem_pizzas} → ${novaContagem} pizzas, R$ ${existing.valor_gasto_pizzas} → R$ ${novoValor}`);
};

// Verificar fidelidade e disparar webhook se atingir meta
export const verificarFidelidade = async (
  customerName: string,
  customerPhone: string,
  itens: any[]
): Promise<void> => {
  try {
    console.log("🔍 [FIDELIDADE] Itens recebidos:", JSON.stringify(itens, null, 2));
    
    // Filtrar apenas pizzas de 8+ pedaços
    const pizzasElegiveis = itens.filter(isPizzaElegivel);
    
    if (pizzasElegiveis.length === 0) {
      console.log("Nenhuma pizza elegível para fidelidade neste pedido");
      return;
    }

    console.log("🍕 [FIDELIDADE] Pizzas elegíveis:", pizzasElegiveis.map(p => ({
      name: p.name || p.nome,
      quantity: p.quantity,
      price: p.price || p.preco,
      subtotal: p.subtotal
    })));

    const quantidadePizzas = pizzasElegiveis.reduce(
      (acc, item) => {
        const qty = Number(item.quantity) || 1;
        console.log(`  ➡️ Item "${item.name || item.nome}": quantity=${item.quantity} (parsed: ${qty})`);
        return acc + qty;
      },
      0
    );

    const valorPizzas = pizzasElegiveis.reduce((acc, item) => {
      const subtotal = item?.subtotal;
      if (typeof subtotal === "number") return acc + subtotal;
      if (typeof subtotal === "string" && subtotal.trim() !== "" && !Number.isNaN(Number(subtotal))) {
        return acc + Number(subtotal);
      }

      const preco = item.price || item.preco || 0;
      const qtd = Number(item.quantity) || 1;
      return acc + preco * qtd;
    }, 0);

    console.log(`🍕 [FIDELIDADE] Total: ${quantidadePizzas} pizzas, R$ ${valorPizzas}`);

    // Atualizar progresso
    await atualizarProgresso(customerPhone, customerName, quantidadePizzas, valorPizzas);

    // Buscar progresso atualizado
    const progresso = await getClienteProgresso(customerPhone);
    
    // Buscar regras ativas
    const regrasAtivas = await getRegrasAtivas();

    for (const regra of regrasAtivas) {
      let atingiuMeta = false;

      if (regra.criterio === "quantidade_compras" && progresso.contagem >= regra.meta) {
        atingiuMeta = true;
      } else if (regra.criterio === "valor_gasto" && progresso.valorGasto >= regra.meta) {
        atingiuMeta = true;
      }

      if (atingiuMeta) {
        console.log(`🎉 Cliente ${customerName} atingiu meta da regra: ${regra.nome}`);

        // Disparar webhook
        const payload = {
          cliente: {
            nome: customerName,
            whatsapp: customerPhone,
          },
          regra: {
            id: regra.id,
            nome: regra.nome,
            criterio: regra.criterio,
            meta: regra.meta,
            premio_tipo: regra.premio_tipo,
          },
          progresso: {
            contagem_pizzas: progresso.contagem,
            valor_gasto_pizzas: progresso.valorGasto,
          },
          timestamp: new Date().toISOString(),
        };

        try {
          const { withComunicacaoMeta } = await import("@/utils/webhookPayload");
          const enriched = await withComunicacaoMeta(payload);
          const response = await fetch(
            "https://n8n-n8n-start.yh11mi.easypanel.host/webhook/fidelidade_Aut5",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(enriched),
            }
          );

          if (response.ok) {
            console.log("✅ Webhook de fidelidade enviado com sucesso!");
            // Ajustar progresso mantendo o excedente
            await ajustarProgressoAposMeta(customerPhone, regra.meta, regra.criterio);
          } else {
            console.error("❌ Falha ao enviar webhook:", await response.text());
          }
        } catch (webhookError) {
          console.error("❌ Erro ao enviar webhook de fidelidade:", webhookError);
        }
        
        // Sair após processar primeira meta atingida
        break;
      }
    }
  } catch (error) {
    console.error("Erro ao verificar fidelidade:", error);
  }
};
