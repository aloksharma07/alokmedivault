<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI credentials.** Keep Groq model calls in authenticated server functions,
  use the server-side `GROQ_API_KEY`, and never expose provider keys to browser code.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project architecture
- Keep account data, protected medical-report workflows, and private report files in TanStack Start and Lovable Cloud; this preserves managed sign-in and server-enforced privacy.
- Use outlet-only parent routes with leaf index pages for nested workflows; this lets list, detail, and edit screens render independently with their own metadata.
- Serve public report links through unguessable, revocable, expiring tokens scoped to one report; validate the token before issuing a short-lived URL to the private file.
- Route Groq report explanations directly to Groq from authenticated server functions; keep provider credentials and report text out of browser-facing logs.
