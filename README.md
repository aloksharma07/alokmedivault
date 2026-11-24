# Alokmedivault

/skill:migrate-external-project Source: code archive. Migrate the attached project into Lovable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://alokmedivault.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd26ad88-dfeb-406e-ad2d-6c18c3220c2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Report AI

Report summaries and follow-up questions are available on a patient's PDF report detail page. The selected report text is sent from the browser to the authenticated server function and forwarded through the Lovable Groq connector; provider credentials are server-side only. Scanned PDFs and image reports are not supported.

To enable AI, configure the Lovable Groq connector and its server-side secrets (`LOVABLE_API_KEY` and `UDC_GROQ_AI_FOR_MEDIVAULT_API_KEY`) in Lovable Cloud. Do not add these secrets to browser variables (`VITE_*`) or commit them. If a Groq key has been exposed in chat or another public place, revoke it and create a replacement before configuring the connector.

For local development, copy `.env.example` to `.env`, add the Supabase and Lovable Groq server secrets there, and restart `npm run dev`. Never commit `.env` or place Lovable API secrets in `VITE_*` variables.
