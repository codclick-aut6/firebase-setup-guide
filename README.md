## ClickCommerce

**Versão 1.1.13**  

**URL**: https://crave-cardapio-display.lovable.app

##Criado por ClickPrato##  

**Alterações:**  

**V. 1.1.10**  

- Adicionado cache em memória para carregamento rapido das opções de pizza meio a meio (TTL 60s, com deduplicação de requisições em voo e invalidação automática em save/delete) para getAllMenuItems e getAllVariations. Como o Index já carrega esses dados ao abrir o cardápio, na primeira abertura do modal de meio a meio os dados já estarão em cache e as dropdowns populam instantaneamente.

- Adicionado o toggle "Válido apenas para primeira compra" no modal, badge no card e validação que bloqueia o cupom (pedindo login se for visitante, ou avisando se o cliente já tem pedidos anteriores).

-  Adicionada a tabela de horários em "Minha Empresa" (salva em empresa_info.horarios_funcionamento), um banner "Loja fechada" ou "Loja Aberta" no cardápio e no checkout, e o bloqueio do botão Finalizar Pedido fora do horário — usuários com role moderator, admin ou super-admin continuam podendo finalizar normalmente.

-------------------------------------------------------------------------------------
**V. 1.1.12**
-------------------------------------------------------------------------------------
**Executada a reformulação do cardápio para mobile:**

Alterações Principais:
- Diminuição geral do tamanho da caixa de informações do header, com diminuição do logo, agora localizado do lado esquerdo, com o "nome da empresa" e "descrição" alinhados com o logo. O indicador de avaliações foi retirado da exibição.
- Inclusão da informação loja "Aberta" ou "Fechada", com a informação do próximo horário de abertura ou fechamento (Ex: Fecha as 23h00 ou "Abre às 18h00") de acordo com a tabela de horários da página "minha-empresa".
- Inclusão de dois banners abaixo do header. Esses dois banners devem ter a opção de serem configurados na página "layout", com botão para upload da imagem e campo para a exibição/inclusão da URL da imagem, como já acontece com o banner principal. Os banners devem ter as dimensões 2:1, conforme às dimensões da imagem anexa.
- Redução do tamanho vertical do banner principal.
- Aumento no comprimento da barra de busca.
- Diminuição da fonte do menu de categorias, cabendo maior número de categorias na exibicao.
- Alteração da localização do e-mail logado,
- Uniformização dos botões "Fale Conosco", "Meus Pedidos" e "Sair", mantendo os 3 botões com tamanhos iguais.
- Diminuição da fonte no título das categorias no cardápio.

-------------------------------------------------------------------------------------

- Adicionadas a cada banner (principal + 2 extras) duas funções configuráveis na página Layout: Abrir link ou Aplicar cupom. No select de "Ação ao clicar" pode-se escolher qual atribuir; o link abre em nova aba e o cupom é validado e aplicado automaticamente ao carrinho via useBannerAction, mesmo antes do usuário começar o pedido — ele já aparece aplicado no checkout.
- A escolha do cupom é feita por um dropdown com todos os cupons disponíveis.

-------------------------------------------------------------------------------------
**V. 1.1.13**
-------------------------------------------------------------------------------------
**Ediçao de mensagem de "Cupom Aplicado ao clicar no banner:**

**Alterações**
Adicionada a mensagem de "cupom aplicado" quando clicado no banner de cupom. A mensagem pode ser editada e salva na tela de Layout, usando {cupom} para inserir o nome do cupom se necessário. 
Modificada a cor do toast para verde-à-lato. 
Adicionada persistência do toast até que o usuário chegue à página de checkout 
