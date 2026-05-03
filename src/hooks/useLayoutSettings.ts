import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LayoutSettings {
  empresa_nome: string;
  empresa_descricao: string;
  empresa_logo_url: string;
  empresa_banner_url: string;
  empresa_banner_mobile_url: string;
  usar_mesma_imagem_mobile: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fonte: string;
  cor_fonte_categorias: string;
  cor_fonte_titulos: string;
  cor_fonte_secundaria: string;
  cor_background: string;
  cor_barra_botoes: string;
  cor_botoes: string;
  cor_fonte_botoes: string;
  cor_background_header: string;
  cor_chat_cabecalho: string;
  cor_chat_fonte_cabecalho: string;
  cor_chat_fonte_baloes: string;
  layout_colunas_mobile: string;
}

const defaults: LayoutSettings = {
  empresa_nome: 'Preciosa Fragrância',
  empresa_descricao: 'Perfumes Importados 100% ORIGINAIS',
  empresa_logo_url: 'https://aealgiyzbenbhhftwkxb.supabase.co/storage/v1/object/public/imagens-cardapio/precioso_frasco.webp',
  empresa_banner_url: 'https://aealgiyzbenbhhftwkxb.supabase.co/storage/v1/object/public/imagens-cardapio/bk-imports.webp',
  empresa_banner_mobile_url: '',
  usar_mesma_imagem_mobile: 'true',
  cor_primaria: '#ff6600',
  cor_secundaria: '#ff9933',
  cor_fonte: '#1f2937',
  cor_fonte_categorias: '#1f2937',
  cor_fonte_titulos: '#1f2937',
  cor_fonte_secundaria: '#6b7280',
  cor_background: '#f9fafb',
  cor_barra_botoes: '#ffffff',
  cor_botoes: '#ffffff',
  cor_fonte_botoes: '#1f2937',
  cor_background_header: '#ffffff',
  cor_chat_cabecalho: '#ff4400',
  cor_chat_fonte_cabecalho: '#ffffff',
  cor_chat_fonte_baloes: '#050200',
  layout_colunas_mobile: '1',
};

export const useLayoutSettings = () => {
  const [settings, setSettings] = useState<LayoutSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const keys = Object.keys(defaults);
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', keys);

      if (error) {
        console.error('Erro ao buscar configurações de layout:', error);
        return;
      }

      if (data && data.length > 0) {
        const merged = { ...defaults };
        data.forEach((row) => {
          if (row.chave in merged && row.valor) {
            (merged as any)[row.chave] = row.valor;
          }
        });
        setSettings(merged);
      }
    } catch (err) {
      console.error('Erro ao buscar layout:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, refetch: fetchSettings };
};

export const saveLayoutSetting = async (chave: string, valor: string) => {
  const { data: existing } = await supabase
    .from('configuracoes')
    .select('id')
    .eq('chave', chave)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('configuracoes')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('configuracoes')
      .insert({ chave, valor });
    if (error) throw error;
  }
};
