
----------------------------------------------------
**V.1.163.2** - codclick-aut6/firebase-setup-guide - 19/10/2026**
----------------------------------------------------
- Resolvido o BUG de cupom com valor minimo => Quando retirados produtos de carrinho e deixado com valor inferior ao exigido pelo cupom, o desconto continuava válido.

O QUE FOI AJUSTADO: 
Estado do cupom (CartContext.tsx):
Adicionar o campo valor_minimo_pedido à interface AppliedCoupon e persistir junto ao cupom no localStorage.
Entrada do cupom (CouponField.tsx e ShoppingCart.tsx):
Salvar cupomData.valor_minimo_pedido no objeto do cupom aplicado.
Recálculo em tempo real (CartContext.tsx):
Ao recalcular o total do carrinho após qualquer remoção/alteração de quantidade, checar se cartTotal < valor_minimo_pedido.
Validação final no Checkout (Checkout.tsx):
Antes de submeter o pedido, checar no backend/Supabase se o cupom ainda atende ao valor mínimo dos produtos, evitando qualquer inconsistência.

- Botão "Adicionar Mais Itens" no checkout levava para a página inicial "/". Agora leva para "/cardapio"; Linha 1860 de checkout.tsx
