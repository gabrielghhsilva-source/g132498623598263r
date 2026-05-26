## Objetivo
Fechar o buraco de segurança: hoje qualquer pessoa com a URL do Supabase pode ler/apagar a `app_state`. Vou trocar a política "tudo público" por **autenticação real (email + senha)** com RLS escopada por `auth.uid()`.

## O que muda pra você (usuário final)

1. Ao abrir o app, **antes** da tela atual com senha `CaveCreate2026*`, aparece uma tela de **Login / Cadastro** (email + senha).
2. Você cria sua conta **uma vez** (ex: seu email + senha forte).
3. Depois disso, eu **desabilito novos cadastros** no backend pra ninguém mais criar conta no seu projeto.
4. A senha do app (`CaveCreate2026*`) **continua existindo** como segunda camada — não mexo nela.
5. Cada conta tem seus próprios dados na nuvem. Como é só você, vai ser uma conta só.

## O que muda no backend

### 1. Migration na tabela `app_state`
```text
- Adicionar coluna user_id (uuid, NOT NULL após backfill)
- Remover policies públicas atuais (USING true)
- Criar policies novas: USING (auth.uid() = user_id)
- Permitir SELECT/INSERT/UPDATE/DELETE só pro próprio usuário autenticado
- GRANT apenas para 'authenticated', remover acesso 'anon'
```

**Atenção**: dados já salvos na nuvem (sem user_id) vão ficar órfãos. Como sua memória diz que **localStorage é a fonte primária** e o Supabase é só backup, isso não te quebra — a primeira sincronização após login regrava tudo da sua máquina.

### 2. Configurar Auth
- Habilitar email/password
- **Não** habilitar Google (é app desktop pessoal, não precisa)
- **Não** habilitar auto-confirm email (precisa verificar email no cadastro)
- Habilitar HIBP (bloqueia senhas vazadas conhecidas)
- Após você criar sua conta: rodar `disable_signup: true` pra travar novos cadastros

### 3. Atualizar código de sync
- Toda chamada a `app_state` precisa pegar `user_id` da sessão atual
- Se não tiver sessão → não sincroniza (só usa localStorage local)
- Adicionar `onAuthStateChange` listener

## Estrutura de arquivos

```text
src/
  pages/
    Auth.tsx              ← NOVO: tela de login/cadastro Supabase
  components/
    AuthGate.tsx          ← NOVO: wrapper que checa sessão antes do PasswordGate atual
  lib/
    cloudSync.ts          ← MODIFICADO: incluir user_id em todas as queries
  App.tsx                 ← MODIFICADO: AuthGate envolve PasswordGate existente
```

## Ordem de execução

1. Migration SQL (esperar você aprovar)
2. Configurar auth settings (email/password, HIBP)
3. Criar página `Auth.tsx` + `AuthGate.tsx`
4. Atualizar `cloudSync.ts` (e qualquer outro arquivo que toque `app_state`) pra incluir `user_id`
5. Envolver `App.tsx` com `AuthGate` antes do `PasswordGate`
6. Você cria sua conta e me avisa
7. Eu rodo `disable_signup: true` pra travar cadastros

## Pontos de atenção

- **Você vai precisar de um email real** pra confirmar o cadastro (vai chegar um link de verificação)
- Se você esquecer a senha do Supabase, precisa criar tela de "esqueci senha" depois (posso adicionar)
- A migração de RLS é **destrutiva** pras policies antigas — não tem volta sem rollback manual
- O atalho de senha do app (`CaveCreate2026*`) **continua na memória** — sem mudança nele

Posso seguir?