# Como contribuir

O PanicBoard é mantido por uma pessoa só, e o projeto tem uma visão própria (veja [PRODUCT.md](PRODUCT.md) e [DESIGN.md](DESIGN.md)). Contribuições são bem-vindas, mas **nada entra na `main` sem revisão do mantenedor**. Só o mantenedor tem acesso de escrita ao repositório: todo o resto chega por pull request.

## Antes de começar

- **Mudança pequena** (correção de bug, texto, detalhe): pode abrir o pull request direto.
- **Mudança grande** (tela nova, mudança no comportamento, dependência nova): abra antes uma [issue](../../issues) explicando o que e por quê. Assim ninguém perde tempo com algo que não vai entrar.
- **Visual:** a aparência do app é definida no DESIGN.md. Mudanças de estilo só entram se combinadas antes.

## Como enviar

1. Faça um fork e crie uma branch a partir da `main`.
2. Instale e rode localmente: `npm install` e `npm run dev` (veja o [README](README.md)).
3. Antes de abrir o pull request, rode e deixe tudo passando:

   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. Regra de negócio ou correção de bug leva um teste junto (o projeto usa Vitest, em `src/domain`).
5. Mensagens de commit curtas, no estilo do histórico: `feat: …`, `fix: …`.
6. No pull request, explique o que mudou e como você testou.

## O que não enviar

- Chaves, senhas, tokens ou arquivos `.env` (o `.env.local` já está no `.gitignore`).
- Dados pessoais ou de clientes em exemplos, prints ou testes.
- Mudanças sem relação com o objetivo do pull request.

## Falhas de segurança

Não abra issue pública. Siga o [SECURITY.md](SECURITY.md).

## Licença

Ao contribuir, você concorda que o seu código fica sob a [licença MIT](LICENSE) do projeto.
