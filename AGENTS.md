# Project Architecture

- Use `getOrderItemDisplayName` for customer-facing and printed item titles so half-pizza formatting stays consistent without changing stored order data.
- Dine-in (QR table) orders are stored in `pedidos_sabor_delivery` with `origem = 'salao'` and `mesa`, so kitchen, printing and reports share one order pipeline; the `mesas` table only tracks tables.
- Printed order identifiers use the first six characters of the order UUID so the comanda and delivery stub show the same short code as the app.
- Missing distance-provider configuration must return a handled availability message rather than an HTTP 500 so checkout remains usable.
- Thermal print font settings are stored together under `comanda_font_sizes`, with distinct fields for the order receipt and delivery stub, so preview, test, and live printing stay synchronized.
- A newly split layout color must fall back to the key it was separated from while that key is absent in `configuracoes` (e.g. `cor_background_cards` → `cor_background_header`), so stores configured before the split keep their current look.

