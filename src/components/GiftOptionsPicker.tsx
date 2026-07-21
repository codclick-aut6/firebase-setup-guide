import React, { useEffect, useRef, useState } from "react";
import { Gift, Minus, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GiftOption {
  product_id: string;
  product_name: string;
}

export interface GiftChoice {
  product_id: string;
  product_name: string;
  quantidade: number;
}

interface Props {
  opcoes: GiftOption[];
  escolhas: GiftChoice[];
  totalAlvo: number;
  onChange: (escolhas: GiftChoice[]) => void;
}

const ROW_HEIGHT = 40; // px, approx per row including padding
const MAX_VISIBLE = 5;

const GiftOptionsPicker: React.FC<Props> = ({ opcoes, escolhas, totalAlvo, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const getQtd = (pid: string) =>
    escolhas.find((e) => e.product_id === pid)?.quantidade || 0;
  const somaAtual = escolhas.reduce((s, e) => s + (e.quantidade || 0), 0);
  const restante = Math.max(0, totalAlvo - somaAtual);
  const hasOverflow = opcoes.length > MAX_VISIBLE;

  const setQtd = (opt: GiftOption, delta: number) => {
    const map = new Map(escolhas.map((e) => [e.product_id, { ...e }]));
    const atual =
      map.get(opt.product_id) || {
        product_id: opt.product_id,
        product_name: opt.product_name,
        quantidade: 0,
      };
    const novaQtd = atual.quantidade + delta;
    if (novaQtd < 0) return;
    if (delta > 0 && restante <= 0) return;
    atual.quantidade = novaQtd;
    atual.product_name = opt.product_name;
    if (novaQtd === 0) map.delete(opt.product_id);
    else map.set(opt.product_id, atual);
    onChange(Array.from(map.values()));
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolledToEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  };

  useEffect(() => {
    handleScroll();
  }, [opcoes.length]);

  return (
    <div className="space-y-2">
      <label className="text-xs text-green-700 font-medium flex items-center gap-1">
        <Gift className="h-3 w-3" /> Escolha seus brindes
        <span className="ml-auto text-[11px] font-normal text-green-700/80">
          {somaAtual}/{totalAlvo} selecionados
        </span>
      </label>

      <div className="relative bg-white rounded border border-green-200">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto p-2 space-y-1"
          style={{ maxHeight: hasOverflow ? ROW_HEIGHT * MAX_VISIBLE : undefined }}
        >
          {opcoes.map((opt) => {
            const qtd = getQtd(opt.product_id);
            return (
              <div
                key={opt.product_id}
                className="flex items-center justify-between gap-2 text-sm"
                style={{ minHeight: ROW_HEIGHT - 4 }}
              >
                <span className="flex-1 truncate text-foreground">{opt.product_name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQtd(opt, -1);
                    }}
                    disabled={qtd <= 0}
                    aria-label={`Remover ${opt.product_name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{qtd}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQtd(opt, 1);
                    }}
                    disabled={restante <= 0}
                    aria-label={`Adicionar ${opt.product_name}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {hasOverflow && !scrolledToEnd && (
          <>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/90 to-transparent rounded-b" />
            <div className="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 shadow animate-bounce">
                <ChevronDown className="h-3 w-3" />
                Role para ver mais
              </span>
            </div>
          </>
        )}
      </div>

      {restante > 0 && (
        <p className="text-[11px] text-amber-700">
          Selecione mais {restante} {restante === 1 ? "brinde" : "brindes"} para concluir.
        </p>
      )}
    </div>
  );
};

export default GiftOptionsPicker;
