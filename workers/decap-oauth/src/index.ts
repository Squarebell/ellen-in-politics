/**
 * GitHub OAuth proxy for Decap CMS.
 *
 * Secrets (set after deploy):
 *   wrangler secret put GITHUB_CLIENT_ID
 *   wrangler secret put GITHUB_CLIENT_SECRET
 *
 * Optional var:
 *   GITHUB_REPO_PRIVATE=true  → requests `repo` scope (needed for private repos)
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REPO_PRIVATE?: string;
}

function authorizeHtml(status: "success" | "error", token: string): Response {
  const payload = JSON.stringify({ token });
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Authorizing…</title></head>
  <body>
    <p>Authorizing Decap CMS…</p>
    <script>
      (function () {
        function receiveMessage(message) {
          window.opener.postMessage(
            "authorization:github:${status}:${payload}",
            "*"
          );
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      if (url.searchParams.get("provider") !== "github") {
        return new Response("Invalid provider", { status: 400 });
      }
      if (!env.GITHUB_CLIENT_ID) {
        return new Response("Missing GITHUB_CLIENT_ID secret", { status: 500 });
      }

      const privateRepo =
        env.GITHUB_REPO_PRIVATE === "true" || env.GITHUB_REPO_PRIVATE === "1";
      const scope = privateRepo ? "repo user" : "public_repo user";
      const redirectUri = `${url.origin}/callback`;

      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("state", crypto.randomUUID());

      return Response.redirect(authUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400 });
      }
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return new Response("OAuth secrets not configured", { status: 500 });
      }

      const redirectUri = `${url.origin}/callback`;
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
          }),
        },
      );

      const data = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!data.access_token) {
        return authorizeHtml(
          "error",
          data.error_description || data.error || "token exchange failed",
        );
      }

      return authorizeHtml("success", data.access_token);
    }

    return new Response("Ellen Decap OAuth proxy — use /auth", { status: 200 });
  },
};
