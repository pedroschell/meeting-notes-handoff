# meeting-notes-handoff

Lê a transcrição das reuniões (**Anotações do Gemini**) no Google Calendar,
analisa as pautas com um LLM, separa as **demandas do cliente** e as **demandas
da empresa** e envia cada ata ao canal certo do Discord.

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
  permissão só de leitura da agenda e dos documentos, e cada um usa o próprio
  cliente OAuth. Nenhuma credencial vem com o projeto.
- **Nada de agência ou cliente no código.** Chaves e nome da empresa ficam no
  `.env`, e o mapa de clientes para canais fica no `canais.json`. Os dois ficam
  fora do git, e o `.env.example` e o `canais.example.json` mostram o formato.
- **Roda uma vez e encerra.** Feito para disparo manual ou agendado.
- **Respeita os limites das APIs.** Espera 60 s entre um resumo e outro, por
  causa do limite de uso da Groq, e reenvia ao Discord quando ele pede para
  aguardar.

## Como rodar

1. **Cliente OAuth do Google:** no Google Cloud, ative as APIs Google Calendar
   e Google Docs, crie um cliente OAuth do tipo "App para computador" e salve
   o arquivo baixado como `credentials.json` na raiz do projeto.
2. **Login na agenda:** `npm run autorizar` mostra um link de login. Ao concluir,
   o `token.json` é salvo na raiz.
3. **Variáveis:** copie o `.env.example` para `.env` e preencha:

   | Variável | O que é |
   |---|---|
   | `DISCORD_TOKEN` | token do bot do Discord |
   | `DISCORD_CHANNEL_ID` | canal padrão, para reuniões que não citam nenhum cliente |
   | `GROQ_API_KEY` | chave da API da Groq |
   | `GROQ_MODEL` | modelo usado no resumo |
   | `NOME_DA_EMPRESA` | nome da empresa que presta o serviço, usado no prompt e no rótulo das demandas |

4. **Canais dos clientes:** copie o `canais.example.json` para `canais.json` e
   cadastre o canal e as palavras-chave de cada cliente.
5. **Disparo:** `npm start` envia as atas novas dos últimos 7 dias.

Os testes rodam com `npm test`, sem acessar nenhuma API.

## Stack

Node 22.13+, sem framework e sem dependências externas. Testes com `node:test`
e estado em SQLite com `node:sqlite`, os dois embutidos no Node. As consultas
SQL ficam em `src/sql/`.

## Roteiro

- **v1, concluída:** agenda → resumo e demandas com LLM → Discord, com controle
  de envios em SQLite.
- **v2:** servidor HTTP com rotas de consulta (reuniões, demandas por cliente)
  e sincronização agendada.
- **v3:** várias pessoas, cada uma conectando a própria agenda.

## Licença

MIT
