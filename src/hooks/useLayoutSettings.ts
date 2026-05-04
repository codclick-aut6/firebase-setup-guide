import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

const CACHE_KEY = 'layout_settings_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheShape {
  ts: number;
  data: LayoutSettings;
}

const readCache = (): LayoutSettings | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (!parsed?.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return { ...defaults, ...parsed.data };
  } catch {
    return null;
  }
};

const writeCache = (data: LayoutSettings) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
};

interface LayoutSettingsContextValue {
  settings: LayoutSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextValue | null>(null);

// Promise compartilhada para deduplicar fetches paralelos
let inflightFetch: Promise<LayoutSettings> | null = null;

const fetchLayoutSettings = async (): Promise<LayoutSettings> => {
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    const keys = Object.keys(defaults);
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', keys);

    if (error) {
      console.error('Erro ao buscar configurações de layout:', error);
      return defaults;
    }

    const merged = { ...defaults };
    if (data && data.length > 0) {
      data.forEach((row) => {
        if (row.chave in merged && row.valor) {
          (merged as any)[row.chave] = row.valor;
        }
      });
    }
    writeCache(merged);
    return merged;
  })();

  try {
    return await inflightFetch;
  } finally {
    inflightFetch = null;
  }
};

export const LayoutSettingsProvider = ({ children }: { children: ReactNode }) => {
  const cached = readCache();
  const [settings, setSettings] = useState<LayoutSettings>(cached ?? defaults);
  const [loading, setLoading] = useState(!cached);

  const refetch = useCallback(async () => {
    const fresh = await fetchLayoutSettings();
    setSettings(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (cached) {
      // Já temos cache válido — não precisa refetch
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement(
    LayoutSettingsContext.Provider,
    { value: { settings, loading, refetch } },
    children
  );
};

export const useLayoutSettings = () => {
  const ctx = useContext(LayoutSettingsContext);
  if (ctx) return ctx;

  // Fallback: caso algum componente seja renderizado fora do Provider,
  // mantém compatibilidade retornando defaults sem disparar fetch.
  return {
    settings: readCache() ?? defaults,
    loading: false,
    refetch: async () => {
      await fetchLayoutSettings();
    },
  };
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

  // Invalida cache para forçar refetch na próxima leitura
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};
