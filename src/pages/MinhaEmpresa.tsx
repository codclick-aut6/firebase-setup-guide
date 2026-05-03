import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function MinhaEmpresa() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [complemento, setComplemento] = useState("");
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Carregar dados salvos ao montar
  useEffect(() => {
    if (currentUser?.uid) {
      loadEmpresaData();
    }
  }, [currentUser]);

  const loadEmpresaData = async () => {
    if (!currentUser?.uid) return;

    try {
      // Buscar user_id UUID do Supabase
      let { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("firebase_id", currentUser.uid)
        .maybeSingle();

      // Se o usuário não existe, criar registro
      if (!userData?.id) {
        console.log("Usuário não encontrado, criando registro...");
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            firebase_id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName,
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Erro ao criar usuário:", insertError);
          return;
        }

        userData = newUser;
      }

      setUserId(userData.id);

      // Buscar dados da empresa — primeiro tenta pelo user_id atual,
      // se não encontrar, pega o primeiro registro existente (fonte única)
      let { data: empresaData, error } = await supabase
        .from("empresa_info")
        .select("*")
        .eq("user_id", userData.id)
        .maybeSingle();

      if (!empresaData) {
        const { data: fallback } = await supabase
          .from("empresa_info")
          .select("*")
          .limit(1)
          .maybeSingle();
        empresaData = fallback;
      }

      if (error) {
        console.error("Erro ao carregar dados da empresa:", error);
        return;
      }

      if (empresaData) {
        setEmpresaId(empresaData.id);
        setNome(empresaData.nome || "");
        setTelefone(empresaData.telefone || "");
        setWhatsapp(empresaData.whatsapp || "");
        setCep(empresaData.cep || "");
        setRua(empresaData.rua || "");
        setNumero(empresaData.numero || "");
        setBairro(empresaData.bairro || "");
        setCidade(empresaData.cidade || "");
        setEstado(empresaData.estado || "");
        setComplemento(empresaData.complemento || "");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // 🔍 Busca automática no ViaCEP
  const buscarEndereco = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await resposta.json();

        if (!data.erro) {
          setRua(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setEstado(data.uf || "");
        } else {
          toast.error("CEP não encontrado!");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        toast.error("Erro ao buscar o CEP.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      toast.error("Você precisa estar logado para salvar as informações");
      return;
    }

    if (!userId) {
      toast.error("Erro ao identificar usuário");
      return;
    }
    
    setLoading(true);

    // Montar endereço completo
    const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}, ${cep}`;

    const empresaData = {
      user_id: userId,
      nome,
      telefone,
      whatsapp,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      complemento,
      endereco: enderecoCompleto,
      pais: "Brasil",
    };

    try {
      let error;

      if (empresaId) {
        // Atualizar registro existente
        const result = await supabase
          .from("empresa_info")
          .update(empresaData)
          .eq("id", empresaId);
        error = result.error;
      } else {
        // Criar novo registro
        const result = await supabase
          .from("empresa_info")
          .insert([empresaData])
          .select("id")
          .single();
        error = result.error;
        if (result.data) {
          setEmpresaId(result.data.id);
        }
      }

      if (error) {
        console.error("Erro ao salvar no Supabase:", error);
        toast.error("Erro ao salvar as informações.");
      } else {
        toast.success("Informações salvas com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      toast.error("Erro ao salvar as informações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-6 border border-gray-100">

        {/* 🔸 Cabeçalho com título e botão alinhados */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#fa6500] mb-3 sm:mb-0">
            Informações da Empresa
          </h1>

          <Button 
            onClick={() => navigate("/admin-dashboard")} 
            variant="outline"
            className="w-full sm:w-auto text-sm border-[#fa6500] text-[#fa6500] hover:bg-[#fa6500] hover:text-white transition-all"
          >
            Painel de Administração 
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">
              Nome da Empresa
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pizzaria Primo's"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 0000-0000"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">WhatsApp</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <hr className="my-4" />

          {/* Endereço */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">CEP</label>
            <input
              type="text"
              value={cep}
              onChange={(e) => {
                setCep(e.target.value);
                buscarEndereco(e.target.value);
              }}
              placeholder="Digite o CEP"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700">Rua</label>
            <input
              type="text"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              placeholder="Rua Exemplo"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700">
              Número
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="123"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 text-gray-700">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-700">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700">Estado (UF)</label>
            <input
              type="text"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              placeholder="SP"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-gray-700">Complemento</label>
            <input
              type="text"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Ponto de referência, bloco, etc."
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#fa6500]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white font-semibold shadow-md transition-all duration-200 bg-[#fa6500] hover:bg-[#e75a00]"
          >
            {loading ? "Salvando..." : "Salvar Informações"}
          </button>
        </form>
      </div>
    </div>
  );
}
