## ClickPrato

** Versão 1.9.240

**URL**: https://clickprato-aut6.lovable.app

##Criado por CodClick

**Alteração:**
Agora ao lado do botão de sair na pagina admin-dashboard, o e-mail logado é exibido
* Arquivos Alterados:
src/pages/AdminDashboard.tsx

**Alteração:**
Agora o item pode ser atribuído a uma categoria principal e a múltiplas categorias adicionais via checkboxes no modal de edição, aparecendo em todas elas tanto no cardápio quanto no admin.
* Arquivos Alterados:
src/types/menu.ts
src/components/admin/EditMenuItemModal.tsx
src/pages/Index.tsx
src/components/admin/MenuItemsTab.tsx

**Alteração:**
Invertida a posicao dos Tabs Categorias e Items, mantendo a hierarwuia logica
* Arquivos Alterados:
src/pages/admin.tsx

**Alteração:**
Adicionei um botão "Salvar" ao lado da pré-visualização da imagem para facilitar a edicao das imagens do cardapio
* Arquivos Alterados:
src/components/admin/EditMenuItemModal.tsx

**Alteração:**
Manter a pagina na podicao de origem de antes dr editar o item. Isso evita ter que rolar a pagina ate a posioao anterior
* Arquivos Alterados:
src/components/admin/MenuItemsTab.tsx
