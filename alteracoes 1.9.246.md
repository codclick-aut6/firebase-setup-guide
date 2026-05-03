# ClickPrato  

** Versão 1.9.246 - 02/05/2026  

**URL Lovable**: https://clickprato-aut6.lovable.app  
**URL Produção**: https://pizzariaoliveira.clickprato.com.br  

## Criado por CodClick  

-----------------------------------------------------------------------------------------------------

**Alteração:**  
- Mudança no layout mobile para acondicionar melhor os botões e economizar espaço para a primeira visão da página

**Arquivos Alterados:**  
src/pages/index.tsx
src/components/CategoryNav.tsx 

-----------------------------------------------------------------------------------------------------

**Correção:** 
O cardápio não estava separando corretamente novos usuários de usuários recorrentes.
O ChatAssistant é renderizado dentro do Index e usa useSessionId() com useState(() => getSessionId()) — isso roda durante o render, antes do useEffect do Index. Então quando trackMenuVisit finalmente executa, a sessão já foi criada pelo ChatAssistant e isNewSession retorna false, abortando o registro

**Arquivos Alterados:**  
src/utils/trackingEvents.ts


-----------------------------------------------------------------------------------------------------

**Alteração:** 
- Criado um modal que abra ao clicar em cima da barra "visitas ao cardápio", que exibe:

- numero de visitas novas (novos usuários)  
- numero de visitas recorrentes  
- numero de visitas por utm_source  
- numero de visitas por utm_campaign  
- numero de visitas por utm_medium  
- numero de visitas por utm_content  
Todos os dados tem de estar sujeitos ao periodo de datas selecionado no topo da página