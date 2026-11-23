# Segurança

## Como reportar uma falha

**Não abra uma issue pública.** Use o relato privado do GitHub: na página do repositório, aba **Security**, botão **Report a vulnerability**. Só o mantenedor vê o relato.

Conte o que você encontrou, como reproduzir e qual o impacto. Se puder, diga também em que versão ou commit viu o problema.

O projeto é mantido por uma pessoa, então a resposta é feita com o melhor esforço, sem prazo garantido. Falhas confirmadas são corrigidas na `main`, e você é creditado se quiser.

## O que está coberto

Apenas a versão atual da branch `main`.

## Se você usa o PanicBoard com o seu Supabase

- A chave `anon` do Supabase pode ficar no navegador: quem protege os dados são as políticas de segurança por linha (RLS) das migrações em `supabase/migrations`. Não pule nenhuma migração.
- Nunca publique a chave `service_role` nem arquivos `.env`.
