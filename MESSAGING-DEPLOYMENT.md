# Messaging API deployment

The Express backend serves messaging REST endpoints and Socket.IO. The Next.js
frontend calls both directly; messaging does not use Next.js API route handlers.

## Render and DNS

1. In Render, open the backend **Web Service → Settings → Custom Domains** and
   add `api.eventsora.com`.
2. Add the DNS record Render shows at the provider managing `eventsora.com`.
   For a subdomain this is typically a CNAME for `api` pointing to the Render
   target. Use Render's displayed target rather than the deploy-hook URL.
3. Remove conflicting `AAAA` records for `api`, verify the domain in Render,
   and wait for Render to provision HTTPS.
4. Keep the Render `onrender.com` URL available as a fallback for diagnostics.

## Environment variables

On the Render backend, set:

- `FRONTEND_URL=https://www.eventsora.com`
- `SECRET_KEY` to the same signing key used by the Vercel frontend
- `MONGODB_URI` (or `MONGO_URI`) to the production database

On the Vercel frontend, set:

- `NEXT_PUBLIC_BACKEND_URL=https://api.eventsora.com`

Redeploy both services after changing settings. Do not include `/api` in
`NEXT_PUBLIC_BACKEND_URL`; the frontend adds `/api/message` itself.

Production login cookies are scoped to `.eventsora.com` so the browser can send
the HttpOnly token to `api.eventsora.com`. Keep API requests credentialed and
allow the frontend origin with credentials in Express CORS.
