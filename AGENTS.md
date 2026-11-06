<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Vercel builds use the nitro "vercel" preset when VERCEL env is set (vite.config.ts); Lovable builds stay on Cloudflare. Why: same repo deploys to both hosts.
- Download buttons link straight to /api/public/download/<platform>/<id>. Why: there is no page route at /download/<platform>/<id>.
