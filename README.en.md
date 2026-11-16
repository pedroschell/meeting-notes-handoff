# meeting-notes-handoff

[Português](README.md) | **English**

Reads meeting transcripts (**Gemini notes**, "Anotações do Gemini") from Google
Calendar, analyzes the agenda with an LLM, separates the **client's requests**
from the **company's requests**, and sends each meeting summary to the right
Discord channel.

**In production since June 2026:** 75 meeting summaries written and delivered to
the channels of 7 clients, replacing the manual recap after every meeting.

## How it works

```
Google Calendar ──► finished meetings that have "Gemini notes"
      │
Google Docs ──────► sections of the notes (notes + transcript)
      │
LLM (Groq) ───────► summary + client's requests + agency's requests
      │
Discord ──────────► client's channel, picked by keyword in the title
      │
SQLite ───────────► summaries already sent, so nothing is ever repeated
```

- **Each user connects their own calendar.** Google sign-in uses OAuth, with
  read-only access to the calendar and documents, and each user brings their
  own OAuth client. No credentials ship with the project.
- **No agency or client in the code.** Keys and the company name live in
  `.env`, and the client-to-channel map lives in `canais.json`. Both stay out
  of git, and `.env.example` and `canais.example.json` show the format.
- **Runs once and exits.** Built for manual or scheduled runs.
- **Respects API limits.** Waits 60 s between summaries because of Groq's rate
  limit, and retries on Discord when it asks to wait.

## Getting started

1. **Google OAuth client:** in Google Cloud, enable the Google Calendar and
   Google Docs APIs, create an OAuth client of type "Desktop app", and save the
   downloaded file as `credentials.json` in the project root.
2. **Calendar sign-in:** `npm run autorizar` prints a sign-in link. When you
   finish, `token.json` is saved in the root.
3. **Variables:** copy `.env.example` to `.env` and fill it in:

   | Variable | What it is |
   |---|---|
   | `DISCORD_TOKEN` | Discord bot token |
   | `DISCORD_CHANNEL_ID` | default channel, for meetings that don't mention any client |
   | `GROQ_API_KEY` | Groq API key |
   | `GROQ_MODEL` | model used for the summary |
   | `NOME_DA_EMPRESA` | name of the company providing the service, used in the prompt and in the request labels |

4. **Client channels:** copy `canais.example.json` to `canais.json` and register
   each client's channel and keywords.
5. **Run:** `npm start` sends the new summaries from the last 7 days.

Tests run with `npm test`, without calling any API.

## Stack

Node 22.13+, no framework and no external dependencies. Tests use `node:test`
and state is kept in SQLite with `node:sqlite`, both built into Node. SQL
queries live in `src/sql/`.

## Roadmap

- **v1, done:** calendar → summary and requests with an LLM → Discord, with
  delivery tracking in SQLite.
- **v2:** HTTP server with query routes (meetings, requests per client) and
  scheduled sync.
- **v3:** multiple people, each connecting their own calendar.

## License

MIT
