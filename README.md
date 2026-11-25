
----------------------------------------------------
**V.2.1.1** - doug-aut8/cp-aut8-tracking - 24/11/2026**
----------------------------------------------------
- Alteração do sistema de login/signup -> Migrando para login com whatsapp + senha fixa

#PLANO DE MIGRAÇÃO:#

1. Cadastro (/register)

Campos: Nome, WhatsApp, Senha e Confirmar senha. O e-mail sai da tela.
Por trás, o sistema cria um "e-mail interno" a partir do número (ex.: 5511999998888@cliente.app). O cliente nunca vê esse e-mail.
Se o número já tiver cadastro, aparece o aviso "Este WhatsApp já tem cadastro" com um botão "Entrar".
A confirmação por código no WhatsApp continua do jeito que é hoje.
2. Login (/login)

Campos: WhatsApp e Senha.
O sistema procura a conta pelo número, então clientes antigos (cadastrados com e-mail) entram com o WhatsApp e a mesma senha de sempre.
Para não deixar nenhum e-mail à mostra para quem está de fora, essa busca é feita por uma função protegida no servidor, que só faz o login e não devolve dados.
Se o número não existir, aparece o card "Primeira vez aqui?" e o cadastro já abre com o número preenchido.
Um link pequeno, "Entrar com e-mail", fica disponível para a equipe do painel.
3. Esqueci minha senha

O cliente digita o WhatsApp, recebe um código de 4 dígitos pelo mesmo envio que vocês já usam e cria uma senha nova.
4. Clientes antigos sem WhatsApp no cadastro

Continuam entrando pelo link "Entrar com e-mail" e podem salvar o número na gaveta "Minha conta".
O que você precisa fazer no Supabase

Desligar a opção "Confirm email" (em Authentication → Providers → Email). Como o e-mail interno não recebe mensagens, sem isso os novos cadastros ficam travados.
Pontos de atenção

Dois cadastros antigos com o mesmo número: o login fica bloqueado para esse número e aparece um aviso para falar com a loja. Antes de começar, vou levantar quantos casos assim existem.
Pedidos, fidelidade, cupons e LTV não mudam, porque já usam o telefone.


  
