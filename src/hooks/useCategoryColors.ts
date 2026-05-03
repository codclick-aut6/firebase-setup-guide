import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryColors {
  bgColor: string;
  fontColor: string;
}

const DEFAULT_BG = '#ffffff';
const DEFAULT_FONT = '#1f2937';

export const useCategoryColors = () => {
  const [colors, setColors] = useState<Record<string, CategoryColors>>({});
  const [loading, setLoading] = useState(true);

  const fetchColors = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .or('chave.like.cat_bg_%,chave.like.cat_font_%');

      if (error) {
        console.error('Erro ao buscar cores de categorias:', error);
        return;
      }

      const map: Record<string, CategoryColors> = {};
      data?.forEach((row) => {
        if (row.chave.startsWith('cat_bg_')) {
          const catId = row.chave.replace('cat_bg_', '');
          if (!map[catId]) map[catId] = { bgColor: DEFAULT_BG, fontColor: DEFAULT_FONT };
          map[catId].bgColor = row.valor || DEFAULT_BG;
        } else if (row.chave.startsWith('cat_font_')) {
          const catId = row.chave.replace('cat_font_', '');
          if (!map[catId]) map[catId] = { bgColor: DEFAULT_BG, fontColor: DEFAULT_FONT };
          map[catId].fontColor = row.valor || DEFAULT_FONT;
        }
      });
      setColors(map);
    } catch (err) {
      console.error('Erro ao buscar cores de categorias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const getColors = (categoryId: string): CategoryColors => {
    return colors[categoryId] || { bgColor: DEFAULT_BG, fontColor: DEFAULT_FONT };
  };

  return { colors, getColors, loading, refetch: fetchColors };
};
