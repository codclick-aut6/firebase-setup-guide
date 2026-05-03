import { Order } from "@/types/order";

// Função para formatar data em português
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Função para traduzir método de pagamento
const translatePaymentMethod = (method: Order["paymentMethod"]) => {
  const methodMap: Record<Order["paymentMethod"], string> = {
    card: "Cartão",
    cash: "Dinheiro",
    pix: "PIX",
    payroll_discount: "Desconto em Folha"
  };
  return methodMap[method] || method;
};

// Função para calcular subtotal do item incluindo variações
const calculateItemSubtotal = (item: any) => {
  let basePrice = (item.priceFrom ? 0 : (item.price || 0)) * item.quantity;
  let variationsTotal = 0;

  if (item.selectedVariations && Array.isArray(item.selectedVariations)) {
    item.selectedVariations.forEach((group: any) => {
      if (group.variations && Array.isArray(group.variations)) {
        group.variations.forEach((variation: any) => {
          const additionalPrice = variation.additionalPrice || 0;
          const quantity = variation.quantity || 1;
          if (additionalPrice > 0) {
            variationsTotal += additionalPrice * quantity * item.quantity;
          }
        });
      }
    });
  }

  // Adiciona preço da borda recheada
  if (item.selectedBorder && item.selectedBorder.additionalPrice > 0) {
    variationsTotal += item.selectedBorder.additionalPrice * item.quantity;
  }

  return basePrice + variationsTotal;
};

// Função principal para imprimir o pedido
export const printOrder = (order: Order) => {
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${order.id}</title>
      <style>
        @page {
          size: auto;
          margin: 0;
        }

        html, body {
          width: 72mm;
          height: auto;
          margin: 0;
          padding: 2mm;
          overflow: visible;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000;
          box-sizing: border-box;
        }

        * {
          box-sizing: border-box;
        }

        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          margin-bottom: 6px;
          padding-bottom: 4px;
        }

        .header h1 {
          font-size: 14px;
          margin: 0;
          text-transform: uppercase;
        }

        .header h2 {
          font-size: 12px;
          margin: 2px 0 0 0;
        }

        .order-info {
          margin-bottom: 6px;
        }

        .order-info div {
          margin-bottom: 2px;
        }

        .section-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
          table-layout: fixed;
          word-wrap: break-word;
        }

        .section-table th, .section-table td {
          padding: 4px 0;
          text-align: left;
          vertical-align: top;
        }

        .section-table th {
          font-weight: bold;
          font-size: 12px;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }

        .section-table td {
          font-size: 11px;
        }

        .item-name {
          text-align: center;
          font-size: 12px;
        }

        .item-combination {
          text-align: center;
          font-size: 11px;
          color: #333;
        }

        .price-row {
          border-bottom: none;
        }

        .price-row td {
          padding: 2px 0;
          font-size: 11px;
        }

        .separator {
          border-top: 2px solid #000;
          margin: 4px 0;
        }

        .separator-thin {
          border-top: 1px solid #000;
          margin: 3px 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }

        .summary-row strong {
          font-weight: bold;
        }

        .summary-row.total-final {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 0;
        }

        .footer {
          margin-top: 6px;
          text-align: left;
          font-size: 9px;
          border-top: 1px dashed #ccc;
          padding-top: 4px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Comanda de Pedido</h1>
        <h2>Pedido #${order.id}</h2>
      </div>

      <div class="order-info">
        <div><strong>Data:</strong> ${formatDate(order.createdAt as string)}</div>
        <div><strong>Cliente:</strong> ${order.customerName}</div>
        <div><strong>Telefone:</strong> ${order.customerPhone}</div>
        <div><strong>Endereço:</strong> ${order.address}</div>
        <div><strong>Pagamento:</strong> ${translatePaymentMethod(order.paymentMethod)}</div>
        ${order.observations ? `<div><strong>Obs.:</strong> ${order.observations}</div>` : ''}
      </div>

      <!-- ITENS -->
      ${order.items.map(item => {
        const itemSubtotal = calculateItemSubtotal(item);
        const combinationText = item.isHalfPizza && item.combination
          ? (Array.isArray(item.combination)
              ? item.combination.map((c: any) => c.name || c).join(' + ')
              : typeof item.combination === 'object' && item.combination.flavors
                ? item.combination.flavors.map((f: any) => f.name || f).join(' + ')
                : '')
          : '';

        // Coleta adicionais com preço
        const adicionais: { name: string; price: number }[] = [];
        if (item.selectedVariations && Array.isArray(item.selectedVariations)) {
          item.selectedVariations.forEach((group: any) => {
            if (group.variations && Array.isArray(group.variations)) {
              group.variations.forEach((v: any) => {
                const halfLabel = v.halfSelection === 'first' ? ' (Metade 1)' : v.halfSelection === 'second' ? ' (Metade 2)' : '';
                adicionais.push({
                  name: (v.name || '') + (v.quantity > 1 ? ` (${v.quantity}x)` : '') + halfLabel,
                  price: (v.additionalPrice || 0) * (v.quantity || 1),
                });
              });
            }
          });
        }

        const hasAdicionais = adicionais.some(a => a.price > 0);
        const hasBorda = item.selectedBorder && item.selectedBorder.additionalPrice > 0;

        return `
          <table class="section-table">
            <thead>
              <tr>
                <th style="width:25%;">Qtd</th>
                <th style="width:75%;text-align:center;">Item</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;font-size:13px;">${item.quantity}</td>
                <td class="item-name">
                  <strong>${item.name}</strong>
                  ${combinationText ? `<div class="item-combination">½ ${combinationText.replace(' + ', ' ½ ')}</div>` : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <table class="section-table">
            <tr class="price-row">
              <td><strong>Unit -</strong> R$ ${(item.price || 0).toFixed(2).replace('.', ',')}</td>
              <td style="text-align:right;"><strong>Subtotal -</strong> R$ ${((item.priceFrom ? 0 : (item.price || 0)) * item.quantity).toFixed(2).replace('.', ',')}</td>
            </tr>
          </table>

          ${hasBorda ? `
            <div class="separator"></div>
            <table class="section-table">
              <tr>
                <td><strong>Borda Recheada</strong></td>
                <td style="text-align:center;">${item.selectedBorder!.name}</td>
                <td style="text-align:right;font-weight:bold;">R$ ${(item.selectedBorder!.additionalPrice * item.quantity).toFixed(2).replace('.', ',')}</td>
              </tr>
            </table>
          ` : ''}

          ${hasAdicionais ? `
            <div class="separator"></div>
            <table class="section-table">
              ${adicionais.filter(a => a.price > 0).map((a, i) => `
                <tr>
                  <td>${i === 0 ? '<strong>Adicionais</strong>' : ''}</td>
                  <td style="text-align:center;">${a.name}</td>
                  <td style="text-align:right;font-weight:bold;">R$ ${(a.price * item.quantity).toFixed(2).replace('.', ',')}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}

          <div class="separator"></div>
        `;
      }).join('')}

      <!-- RESUMO FINANCEIRO -->
      ${(order.discount && order.discount > 0) ? `
        <div class="summary-row">
          <strong>Desconto</strong>
          <span>- R$ ${order.discount.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="separator-thin"></div>
      ` : ''}

      ${order.subtotal ? `
        <div class="summary-row">
          <strong>Sub Total</strong>
          <span style="font-weight:bold;">R$ ${order.subtotal.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="separator-thin"></div>
      ` : ''}

      ${(order.frete && order.frete > 0) ? `
        <div class="summary-row">
          <strong>Frete</strong>
          <span style="font-weight:bold;">R$ ${order.frete.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="separator-thin"></div>
      ` : ''}

      <div class="summary-row total-final">
        <span>TOTAL  -  R$ ${order.total.toFixed(2).replace('.', ',')}</span>
      </div>

      <div class="footer">
        ${new Date().toLocaleString('pt-BR')}
      </div>
    </body>
    </html>
  `;

  // Cria nova janela de impressão
  const printWindow = window.open('', '_blank', 'width=400,height=600');

  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      // Garante que só imprime o conteúdo necessário
      printWindow.document.body.style.height = "auto";
      printWindow.document.body.style.overflow = "visible";

      printWindow.print();
      printWindow.close();
    };
  } else {
    // Fallback via iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.write(printContent);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.print();
        document.body.removeChild(printFrame);
      }, 100);
    }
  }
};
