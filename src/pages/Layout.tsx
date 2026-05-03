import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Palette, Tag, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLayoutSettings, saveLayoutSetting } from '@/hooks/useLayoutSettings';
import { useImageUpload } from '@/hooks/useImageUpload';
import { getAllCategories } from '@/services/categoryService';
import { Category } from '@/types/menu';
import { supabase } from '@/integrations/supabase/client';

const Layout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, loading } = useLayoutSettings();
  const { uploadImage, isUploading } = useImageUpload();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerMobileUrl, setBannerMobileUrl] = useState('');
  const [usarMesmaImagemMobile, setUsarMesmaImagemMobile] = useState(true);
  const [corPrimaria, setCorPrimaria] = useState('#ff6600');
  const [corSecundaria, setCorSecundaria] = useState('#ff9933');
  const [corFonte, setCorFonte] = useState('#1f2937');
  const [corFonteCategorias, setCorFonteCategorias] = useState('#1f2937');
  const [corFonteTitulos, setCorFonteTitulos] = useState('#1f2937');
  const [corFonteSecundaria, setCorFonteSecundaria] = useState('#6b7280');
  const [corBackground, setCorBackground] = useState('#f9fafb');
  const [corBarraBotoes, setCorBarraBotoes] = useState('#ffffff');
  const [corBotoes, setCorBotoes] = useState('#ffffff');
  const [corFonteBotoes, setCorFonteBotoes] = useState('#1f2937');
  const [corBackgroundHeader, setCorBackgroundHeader] = useState('#ffffff');
  const [corChatCabecalho, setCorChatCabecalho] = useState('#ff4400');
  const [corChatFonteCabecalho, setCorChatFonteCabecalho] = useState('#ffffff');
  const [corChatFonteBaloes, setCorChatFonteBaloes] = useState('#050200');
  const [layoutColunasMobile, setLayoutColunasMobile] = useState('1');
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Default colors for reset
  const DEFAULT_COLORS = {
    corPrimaria: '#050200',
    corSecundaria: '#d1001f',
    corFonte: '#000000',
    corBackground: '#f5f5f5',
    corFonteCategorias: '#000000',
    corFonteTitulos: '#000000',
    corFonteSecundaria: '#6b7280',
    corBarraBotoes: '#f5f5f5',
    corBotoes: '#098a00',
    corFonteBotoes: '#f5f5f5',
    corBackgroundHeader: '#f5f5f5',
  };

  // Per-category colors
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, { bgColor: string; fontColor: string }>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    if (!loading) {
      setNome(settings.empresa_nome);
      setDescricao(settings.empresa_descricao);
      setLogoUrl(settings.empresa_logo_url);
      setBannerUrl(settings.empresa_banner_url);
      setBannerMobileUrl(settings.empresa_banner_mobile_url);
      setUsarMesmaImagemMobile(settings.usar_mesma_imagem_mobile !== 'false');
      setCorPrimaria(settings.cor_primaria);
      setCorSecundaria(settings.cor_secundaria);
      setCorFonte(settings.cor_fonte);
      setCorFonteCategorias(settings.cor_fonte_categorias);
      setCorFonteTitulos(settings.cor_fonte_titulos);
      setCorFonteSecundaria(settings.cor_fonte_secundaria);
      setCorBackground(settings.cor_background);
      setCorBarraBotoes(settings.cor_barra_botoes);
      setCorBotoes(settings.cor_botoes);
      setCorFonteBotoes(settings.cor_fonte_botoes);
      setCorBackgroundHeader(settings.cor_background_header);
      setCorChatCabecalho(settings.cor_chat_cabecalho);
      setCorChatFonteCabecalho(settings.cor_chat_fonte_cabecalho);
      setCorChatFonteBaloes(settings.cor_chat_fonte_baloes);
      setLayoutColunasMobile(settings.layout_colunas_mobile);
    }
  }, [loading, settings]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getAllCategories();
        setCategories(cats);

        const { data } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .or('chave.like.cat_bg_%,chave.like.cat_font_%');

        const map: Record<string, { bgColor: string; fontColor: string }> = {};
        cats.forEach((c) => {
          map[c.id] = { bgColor: '#ffffff', fontColor: '#1f2937' };
        });
        data?.forEach((row) => {
          if (row.chave.startsWith('cat_bg_')) {
            const catId = row.chave.replace('cat_bg_', '');
            if (map[catId]) map[catId].bgColor = row.valor || '#ffffff';
          } else if (row.chave.startsWith('cat_font_')) {
            const catId = row.chave.replace('cat_font_', '');
            if (map[catId]) map[catId].fontColor = row.valor || '#1f2937';
          }
        });
        setCategoryColors(map);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  const handleCategoryColorChange = (catId: string, field: 'bgColor' | 'fontColor', value: string) => {
    setCategoryColors((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value },
    }));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setter(url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const layoutPromises = [
        saveLayoutSetting('empresa_nome', nome),
        saveLayoutSetting('empresa_descricao', descricao),
        saveLayoutSetting('empresa_logo_url', logoUrl),
        saveLayoutSetting('empresa_banner_url', bannerUrl),
        saveLayoutSetting('empresa_banner_mobile_url', bannerMobileUrl),
        saveLayoutSetting('usar_mesma_imagem_mobile', usarMesmaImagemMobile ? 'true' : 'false'),
        saveLayoutSetting('cor_primaria', corPrimaria),
        saveLayoutSetting('cor_secundaria', corSecundaria),
        saveLayoutSetting('cor_fonte', corFonte),
        saveLayoutSetting('cor_fonte_categorias', corFonteCategorias),
        saveLayoutSetting('cor_fonte_titulos', corFonteTitulos),
        saveLayoutSetting('cor_fonte_secundaria', corFonteSecundaria),
        saveLayoutSetting('cor_background', corBackground),
        saveLayoutSetting('cor_barra_botoes', corBarraBotoes),
        saveLayoutSetting('cor_botoes', corBotoes),
        saveLayoutSetting('cor_fonte_botoes', corFonteBotoes),
        saveLayoutSetting('cor_background_header', corBackgroundHeader),
        saveLayoutSetting('cor_chat_cabecalho', corChatCabecalho),
        saveLayoutSetting('cor_chat_fonte_cabecalho', corChatFonteCabecalho),
        saveLayoutSetting('cor_chat_fonte_baloes', corChatFonteBaloes),
        saveLayoutSetting('layout_colunas_mobile', layoutColunasMobile),
      ];

      const catPromises = Object.entries(categoryColors).flatMap(([catId, colors]) => [
        saveLayoutSetting(`cat_bg_${catId}`, colors.bgColor),
        saveLayoutSetting(`cat_font_${catId}`, colors.fontColor),
      ]);

      await Promise.all([...layoutPromises, ...catPromises]);
      toast({ title: 'Sucesso', description: 'Configurações de layout salvas!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setShowResetDialog(false);
    setSaving(true);
    try {
      // Update local state with default colors
      setCorPrimaria(DEFAULT_COLORS.corPrimaria);
      setCorSecundaria(DEFAULT_COLORS.corSecundaria);
      setCorFonte(DEFAULT_COLORS.corFonte);
      setCorBackground(DEFAULT_COLORS.corBackground);
      setCorFonteCategorias(DEFAULT_COLORS.corFonteCategorias);
      setCorFonteTitulos(DEFAULT_COLORS.corFonteTitulos);
      setCorFonteSecundaria(DEFAULT_COLORS.corFonteSecundaria);
      setCorBarraBotoes(DEFAULT_COLORS.corBarraBotoes);
      setCorBotoes(DEFAULT_COLORS.corBotoes);
      setCorFonteBotoes(DEFAULT_COLORS.corFonteBotoes);
      setCorBackgroundHeader(DEFAULT_COLORS.corBackgroundHeader);

      // Save all default colors to database
      const resetPromises = [
        saveLayoutSetting('cor_primaria', DEFAULT_COLORS.corPrimaria),
        saveLayoutSetting('cor_secundaria', DEFAULT_COLORS.corSecundaria),
        saveLayoutSetting('cor_fonte', DEFAULT_COLORS.corFonte),
        saveLayoutSetting('cor_background', DEFAULT_COLORS.corBackground),
        saveLayoutSetting('cor_fonte_categorias', DEFAULT_COLORS.corFonteCategorias),
        saveLayoutSetting('cor_fonte_titulos', DEFAULT_COLORS.corFonteTitulos),
        saveLayoutSetting('cor_fonte_secundaria', DEFAULT_COLORS.corFonteSecundaria),
        saveLayoutSetting('cor_barra_botoes', DEFAULT_COLORS.corBarraBotoes),
        saveLayoutSetting('cor_botoes', DEFAULT_COLORS.corBotoes),
        saveLayoutSetting('cor_fonte_botoes', DEFAULT_COLORS.corFonteBotoes),
        saveLayoutSetting('cor_background_header', DEFAULT_COLORS.corBackgroundHeader),
      ];

      await Promise.all(resetPromises);
      toast({ title: 'Sucesso', description: 'Layout resetado para o padrão original!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível resetar o layout.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">Carregando...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Layout da Página</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowResetDialog(true)} 
              disabled={saving || isUploading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar Layout
            </Button>
            <Button onClick={handleSave} disabled={saving || isUploading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Identidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Identidade da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Empresa</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Texto que aparece abaixo do nome"
              />
            </div>

            {/* Logo */}
            <div>
              <Label>Logo</Label>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-24 h-24 rounded-full object-cover border mb-2"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setLogoUrl)}
                disabled={isUploading}
              />
              <Input
                className="mt-2"
                placeholder="Ou cole a URL da imagem"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>

            {/* Banner */}
            <div>
              <Label>Banner (Desktop)</Label>
              {bannerUrl && (
                <img
                  src={bannerUrl}
                  alt="Banner preview"
                  className="w-full h-32 object-cover rounded border mb-2"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setBannerUrl)}
                disabled={isUploading}
              />
              <Input
                className="mt-2"
                placeholder="Ou cole a URL da imagem"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
            </div>

            {/* Banner Mobile */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="usarMesmaImagem"
                  checked={usarMesmaImagemMobile}
                  onChange={(e) => setUsarMesmaImagemMobile(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <Label htmlFor="usarMesmaImagem" className="cursor-pointer text-sm">
                  Usar a mesma imagem para mobile
                </Label>
              </div>
              {!usarMesmaImagemMobile && (
                <div className="space-y-2">
                  <Label>Banner (Mobile)</Label>
                  {bannerMobileUrl && (
                    <img
                      src={bannerMobileUrl}
                      alt="Banner mobile preview"
                      className="w-48 h-32 object-cover rounded border mb-2"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setBannerMobileUrl)}
                    disabled={isUploading}
                  />
                  <Input
                    placeholder="Ou cole a URL da imagem"
                    value={bannerMobileUrl}
                    onChange={(e) => setBannerMobileUrl(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Cores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corFonte} onChange={(e) => setCorFonte(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corFonte} onChange={(e) => setCorFonte(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor de Fundo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corBackground} onChange={(e) => setCorBackground(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corBackground} onChange={(e) => setCorBackground(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte do Menu de Categorias</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corFonteCategorias} onChange={(e) => setCorFonteCategorias(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corFonteCategorias} onChange={(e) => setCorFonteCategorias(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor dos Títulos das Seções</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corFonteTitulos} onChange={(e) => setCorFonteTitulos(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corFonteTitulos} onChange={(e) => setCorFonteTitulos(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte Secundária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corFonteSecundaria} onChange={(e) => setCorFonteSecundaria(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corFonteSecundaria} onChange={(e) => setCorFonteSecundaria(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Barra de Botões</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corBarraBotoes} onChange={(e) => setCorBarraBotoes(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corBarraBotoes} onChange={(e) => setCorBarraBotoes(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor dos Botões</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corBotoes} onChange={(e) => setCorBotoes(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corBotoes} onChange={(e) => setCorBotoes(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte dos Botões</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corFonteBotoes} onChange={(e) => setCorFonteBotoes(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corFonteBotoes} onChange={(e) => setCorFonteBotoes(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor de Fundo do Cabeçalho</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corBackgroundHeader} onChange={(e) => setCorBackgroundHeader(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corBackgroundHeader} onChange={(e) => setCorBackgroundHeader(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor do Cabeçalho do Chat</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corChatCabecalho} onChange={(e) => setCorChatCabecalho(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corChatCabecalho} onChange={(e) => setCorChatCabecalho(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte do Cabeçalho do Chat</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corChatFonteCabecalho} onChange={(e) => setCorChatFonteCabecalho(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corChatFonteCabecalho} onChange={(e) => setCorChatFonteCabecalho(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor da Fonte dos Balões de Conversa</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={corChatFonteBaloes} onChange={(e) => setCorChatFonteBaloes(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={corChatFonteBaloes} onChange={(e) => setCorChatFonteBaloes(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label className="mb-2 block">Pré-visualização</Label>
              <div
                className="rounded-lg overflow-hidden border"
                style={{ backgroundColor: corBackground }}
              >
                <div
                  className="h-16"
                  style={{
                    background: `linear-gradient(to left, ${corSecundaria}, ${corPrimaria})`,
                  }}
                />
                <div className="p-4 rounded mx-2 -mt-4 relative z-10 shadow" style={{ backgroundColor: corBackgroundHeader }}>
                  <span className="font-bold text-lg" style={{ color: corFonte }}>{nome}</span>
                  <p className="text-sm mt-1" style={{ color: corFonte }}>{descricao}</p>
                  <span className="text-xs mt-1 block" style={{ color: corFonte }}>⭐ 4.8 (120+)</span>
                </div>
                <div className="p-4">
                  <div className="flex gap-3 mt-2 px-2 py-1 rounded" style={{ backgroundColor: corBarraBotoes }}>
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: corBotoes, color: corFonteBotoes }}>Meus Pedidos</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: corBotoes, color: corFonteBotoes }}>Sair</span>
                  </div>
                  <span className="text-sm mt-2 block" style={{ color: corFonteCategorias }}>Menu: Categoria</span>
                  <span className="text-base font-semibold mt-1 block" style={{ color: corFonteTitulos }}>Título da Seção</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Mobile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Layout Mobile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Colunas de Produtos no Mobile</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="colunas_mobile"
                    value="1"
                    checked={layoutColunasMobile === '1'}
                    onChange={() => setLayoutColunasMobile('1')}
                    className="accent-orange-500"
                  />
                  <span className="text-sm">1 Coluna</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="colunas_mobile"
                    value="2"
                    checked={layoutColunasMobile === '2'}
                    onChange={() => setLayoutColunasMobile('2')}
                    className="accent-orange-500"
                  />
                  <span className="text-sm">2 Colunas</span>
                </label>
              </div>
            </div>
            {/* Preview */}
            <div>
              <Label className="mb-2 block">Pré-visualização</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className={`grid gap-3 ${layoutColunasMobile === '2' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-2">
                      <div className="bg-gray-200 rounded h-16 mb-2" />
                      <div className="h-2 bg-gray-300 rounded w-3/4 mb-1" />
                      <div className="h-2 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cores por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" /> Cores por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCategories ? (
              <p className="text-sm text-gray-500">Carregando categorias...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((cat) => {
                const cc = categoryColors[cat.id] || { bgColor: '#ffffff', fontColor: '#1f2937' };
                return (
                  <div key={cat.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{cat.name}</span>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{ backgroundColor: cc.bgColor, color: cc.fontColor }}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Cor de Fundo</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={cc.bgColor}
                            onChange={(e) => handleCategoryColorChange(cat.id, 'bgColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={cc.bgColor}
                            onChange={(e) => handleCategoryColorChange(cat.id, 'bgColor', e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Cor da Fonte</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={cc.fontColor}
                            onChange={(e) => handleCategoryColorChange(cat.id, 'fontColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={cc.fontColor}
                            onChange={(e) => handleCategoryColorChange(cat.id, 'fontColor', e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Layout</AlertDialogTitle>
            <AlertDialogDescription>
              O layout será revertido ao formato original. Confirma ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Layout;
