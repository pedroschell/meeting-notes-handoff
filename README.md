# meeting-notes-handoff

Lê a transcrição das reuniões (**Anotações do Gemini**) no Google Calendar,
analisa as pautas com um LLM, separa as **demandas do cliente** e as **demandas
da empresa** e envia cada ata ao canal certo do Discord.

> **Em construção.** O projeto está sendo reescrito passo a passo a partir de
> uma versão que já roda em produção. Cada commit adiciona uma parte que funciona.

## Funcionamento

```
Google Calendar ──► reuniões com "Anotações do Gemini" já encerradas
      │
Google Docs ──────► seções da ata (anotações + transcrição)
      │
LLM (Groq) ───────► resumo + demandas do cliente + demandas da agência
      │
Discord ──────────► canal do cliente, escolhido por palavra-chave no título
      │
SQLite ───────────► atas já enviadas, para nunca repetir
```

- **Cada usuário conecta a própria agenda.** O login no Google é OAuth, com
  permissão só de leitura, e cada um usa o próprio cliente OAuth. Nenhuma
  credencial vem com o projeto.
- **Nada de agência ou cliente no código.** Toda a configuração fica no `.env`,
  fora do git. O `.env.example` lista as variáveis.
- **Roda uma vez e encerra.** Feito para disparo manual ou agendado.

## Stack

Node 22.9+, sem framework. Testes com `node:test` e estado em SQLite com
`node:sqlite`, os dois embutidos no Node.

## Roteiro

- **v1 — em andamento:** agenda → resumo e demandas com LLM → Discord, com
  histórico em SQLite.
- **v2:** servidor HTTP com rotas de consulta (reuniões, demandas por cliente)
  e sincronização agendada.
- **v3:** várias pessoas, cada uma conectando a própria agenda.

## Licença

MIT
