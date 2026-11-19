import express from "express";
import type { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

interface AiMessage {
  role: string;
  content: string;
}

function normalizeProvider(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

async function parseErrorMessage(resp: globalThis.Response, fallbackLabel: string): Promise<string> {
  const errData = (await resp.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  };
  return errData?.error?.message || errData?.message || `${fallbackLabel} error (${resp.status})`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Fast server-side API key connectivity verification (no CORS preflight, low-latency backbone)
  app.post("/api/ai/test", async (req: Request, res: Response) => {
    const provider = normalizeProvider(req.body?.provider);
    const apiKey = String(req.body?.apiKey || "").trim();
    if (!provider || !apiKey) {
      res.status(400).json({ ok: false, error: "Missing provider or API key." });
      return;
    }

    const started = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3800);

    try {
      let resp: globalThis.Response;
      if (provider === "gemini") {
        const url =
          "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          encodeURIComponent(apiKey) +
          "&pageSize=1";
        resp = await fetch(url, { method: "GET", signal: ctrl.signal });
        if (!resp.ok) {
          const msg = await parseErrorMessage(resp, "Gemini API");
          res.status(resp.status).json({ ok: false, error: msg });
          return;
        }
      } else if (
        provider === "openai" ||
        provider === "groq" ||
        provider === "deepseek" ||
        provider === "openrouter"
      ) {
        const endpoints: Record<string, string> = {
          openai: "https://api.openai.com/v1/models",
          groq: "https://api.groq.com/openai/v1/models",
          deepseek: "https://api.deepseek.com/models",
          openrouter: "https://openrouter.ai/api/v1/auth/key",
        };
        const headers: Record<string, string> = {
          Authorization: "Bearer " + apiKey,
        };
        if (provider === "openrouter") {
          headers["X-Title"] = "My Apps Hub";
        }
        resp = await fetch(endpoints[provider], {
          method: "GET",
          headers,
          signal: ctrl.signal,
        });
        if (!resp.ok) {
          const msg = await parseErrorMessage(resp, provider.toUpperCase());
          res.status(resp.status).json({ ok: false, error: msg });
          return;
        }
      } else if (provider === "claude") {
        const headers: Record<string, string> = {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
        resp = await fetch("https://api.anthropic.com/v1/models?limit=1", {
          method: "GET",
          headers,
          signal: ctrl.signal,
        });
        if (resp.status === 404 || resp.status === 405) {
          resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1,
              messages: [{ role: "user", content: "hi" }],
            }),
            signal: ctrl.signal,
          });
        }
        if (!resp.ok) {
          const msg = await parseErrorMessage(resp, "Claude API");
          res.status(resp.status).json({ ok: false, error: msg });
          return;
        }
      } else {
        res.status(400).json({ ok: false, error: "Unsupported provider: " + provider });
        return;
      }

      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      res.json({ ok: true, latencyMs });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError") {
        res.status(504).json({ ok: false, error: "Connection timed out (3.8s)" });
        return;
      }
      res.status(502).json({ ok: false, error: e?.message || "Network error" });
    } finally {
      clearTimeout(timer);
    }
  });

  // Streaming & non-streaming AI chat proxy (eliminates browser CORS preflight & network stalls)
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    const provider = normalizeProvider(req.body?.provider);
    const apiKey = String(req.body?.apiKey || "").trim();
    const model = String(req.body?.model || "").trim();
    const messages: AiMessage[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const systemPrompt = req.body?.systemPrompt ? String(req.body.systemPrompt) : "";
    const useSearchGrounding = Boolean(req.body?.useSearchGrounding);
    const fastMode = req.body?.fastMode !== false;
    const maxTokens = Number(req.body?.maxTokens) || 1024;
    const wantsStream = Boolean(req.body?.stream);

    if (!provider || !apiKey || !model) {
      res.status(400).json({ error: { message: "Missing provider, model, or API key." } });
      return;
    }

    const ctrl = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) {
        ctrl.abort();
      }
    };
    res.on("close", onClose);

    try {
      let upstreamResp: globalThis.Response;

      if (provider === "gemini") {
        const action = wantsStream ? "streamGenerateContent?alt=sse&" : "generateContent?";
        const url =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          encodeURIComponent(model) +
          ":" +
          action +
          "key=" +
          encodeURIComponent(apiKey);
        const contents = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: String(m.content || "") }],
        }));
        const generationConfig: Record<string, unknown> = { temperature: 0.7 };
        if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
        if (fastMode && model.includes("2.5")) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const body: Record<string, unknown> = { contents, generationConfig };
        if (systemPrompt) {
          body.systemInstruction = { parts: [{ text: systemPrompt }] };
        }
        if (useSearchGrounding) {
          body.tools = [{ google_search: {} }];
        }

        upstreamResp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!upstreamResp.ok && upstreamResp.status === 400 && generationConfig.thinkingConfig) {
          delete generationConfig.thinkingConfig;
          upstreamResp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        }
        if (!upstreamResp.ok && useSearchGrounding) {
          delete body.tools;
          upstreamResp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        }
      } else if (
        provider === "openai" ||
        provider === "groq" ||
        provider === "deepseek" ||
        provider === "openrouter"
      ) {
        let endpoint = "https://api.openai.com/v1/chat/completions";
        if (provider === "groq") endpoint = "https://api.groq.com/openai/v1/chat/completions";
        if (provider === "deepseek") endpoint = "https://api.deepseek.com/chat/completions";
        if (provider === "openrouter") endpoint = "https://openrouter.ai/api/v1/chat/completions";

        const apiMessages: AiMessage[] = [];
        if (systemPrompt) apiMessages.push({ role: "system", content: systemPrompt });
        for (const m of messages) {
          apiMessages.push({ role: String(m.role || "user"), content: String(m.content || "") });
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        };
        if (provider === "openrouter") {
          headers["X-Title"] = "My Apps Hub";
        }

        const payload: Record<string, unknown> = {
          model,
          messages: apiMessages,
          temperature: 0.7,
        };
        if (maxTokens) payload.max_tokens = maxTokens;
        if (wantsStream) payload.stream = true;

        upstreamResp = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
      } else if (provider === "claude") {
        const claudeMessages = messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }));
        const payload: Record<string, unknown> = {
          model,
          max_tokens: maxTokens || 1500,
          system: systemPrompt,
          messages: claudeMessages,
        };
        if (wantsStream) payload.stream = true;

        upstreamResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
      } else {
        res.status(400).json({ error: { message: "Unsupported provider: " + provider } });
        return;
      }

      if (!upstreamResp.ok) {
        const errText = await upstreamResp.text().catch(() => "");
        res.status(upstreamResp.status);
        res.setHeader("Content-Type", "application/json");
        res.send(errText || JSON.stringify({ error: { message: `${provider} error (${upstreamResp.status})` } }));
        return;
      }

      const upstreamContentType = upstreamResp.headers.get("content-type") || "";
      if (wantsStream && upstreamResp.body && !upstreamContentType.includes("application/json")) {
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        const reader = upstreamResp.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0 && !res.writableEnded) {
            res.write(Buffer.from(value));
          }
        }
        if (!res.writableEnded) res.end();
        return;
      }

      const data = await upstreamResp.text();
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.send(data);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError") {
        if (!res.writableEnded) res.end();
        return;
      }
      if (!res.headersSent) {
        res.status(502).json({ error: { message: e?.message || "Upstream proxy error" } });
      } else if (!res.writableEnded) {
        res.end();
      }
    } finally {
      res.off("close", onClose);
    }
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
