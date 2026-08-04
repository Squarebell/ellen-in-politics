const APEX_ORIGIN = "https://elleninpolitics.com";

/**
 * Permanent redirect www → apex, preserving path and query.
 */
const wwwRedirectWorker: ExportedHandler = {
  async fetch(request: Request): Promise<Response> {
    try {
      const incoming = new URL(request.url);
      const destination = new URL(APEX_ORIGIN);
      destination.pathname = incoming.pathname;
      destination.search = incoming.search;

      return new Response(null, {
        status: 301,
        headers: {
          Location: destination.href,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(`Redirect failed: ${message}`, { status: 500 });
    }
  },
};

export default wwwRedirectWorker;
