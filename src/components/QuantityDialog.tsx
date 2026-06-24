import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/types/menu";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, ShoppingCart, Pizza } from "lucide-react";

interface QuantityDialogProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: MenuItem, quantity: number) => void;
  onOpenPizzaCombination?: () => void;
}

const QuantityDialog: React.FC<QuantityDialogProps> = ({ item, isOpen, onClose, onConfirm, onOpenPizzaCombination }) => {
  const [quantity, setQuantity] = useState(1);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setQuantity(1);
    }
  };

  const handleConfirm = () => {
    onConfirm(item, quantity);
    setQuantity(1);
    onClose();
  };

  const handleMeioAMeio = () => {
    onClose();
    setQuantity(1);
    onOpenPizzaCombination?.();
  };

  const total = item.price * quantity;
  const showMeioAMeio = item.tipo === "pizza" && item.permiteCombinacao;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {item.image && (
            <div className="w-full h-40 rounded-md overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
          )}

          <div className="text-lg font-bold text-brand">
            {formatCurrency(item.price)}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showMeioAMeio && (
          <Button
            variant="outline"
            onClick={handleMeioAMeio}
            className="w-full mb-2 border-orange-400 text-orange-600 hover:bg-orange-50"
          >
            <Pizza className="mr-2 h-4 w-4" />
            Quero Pizza Meio a Meio
          </Button>
        )}

        <Button 
          onClick={handleConfirm} 
          className="w-full bg-green-600 hover:bg-green-700 text-white border-none"
        >
          <ShoppingCart className="mr-2 h-4 w-4 text-white" />
          Adicionar {quantity}x — {formatCurrency(total)}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default QuantityDialog;
