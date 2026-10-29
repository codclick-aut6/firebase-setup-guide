
----------------------------------------------------
**V.1.171.1** - codclick-aut6/firebase-setup-guide - 29/10/2026**
----------------------------------------------------
- Correção de bug: Cupom compre e ganhe não permitia adição do brinde no carrinho.
A validação no carrinho só olhava o campo individual:
A lógica do carrinho (CartContext, ShoppingCart e CouponField) só comparava item.category === req.category_id. Como nenhum lanche ou pizza tem como categoria principal "OS MAIS QUERIDOS" (eles são "hambúrgueres", "pizzas", etc.), ao adicionar qualquer item, a contagem de produtos válidos resultava em 0.
