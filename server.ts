import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

// Prefer IPv4 first to avoid Happy Eyeballs IPv6 hangs that cause API test timeouts
dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

interface AiMessage {
  role: string;
  content: string;
  parts?: Array<Record<string, unknown>>;
}

type ApiFormat = "openai" | "gemini" | "anthropic";

const UPSTREAM_USER_AGENT = "Mozilla/5.0 (compatible; MyAppsHub/1.0)";

function normalizeProvider(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

function resolveApiFormat(provider: string, rawFormat: unknown): ApiFormat {
  const fmt = String(rawFormat || "").trim().toLowerCase();
  if (fmt === "openai" || fmt === "gemini" || fmt === "anthropic") {
    return fmt;
  }
  if (provider === "gemini") return "gemini";
  if (provider === "claude" || provider === "anthropic") return "anthropic";
  return "openai";
}

function parseExtraHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return out;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return out;
    }
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleanK = String(k || "").trim();
      if (cleanK && v !== undefined && v !== null) {
        out[cleanK] = String(v);
      }
    }
  }
  return out;
}

function applyCustomAuthHeaders(
  headers: Record<string, string>,
  apiKey: string,
  apiFormat: ApiFormat,
  authHeader: string,
  authPrefix: string,
  extraHeaders: Record<string, string>
) {
  const cleanHeader = authHeader.trim();
  const cleanPrefix = authPrefix.trim();
  if (cleanHeader) {
    headers[cleanHeader] = cleanPrefix ? `${cleanPrefix} ${apiKey}` : apiKey;
  } else if (apiFormat === "openai") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (apiFormat === "anthropic") {
    headers["x-api-key"] = apiKey;
  }
  if (apiFormat === "anthropic") {
    headers["anthropic-version"] = headers["anthropic-version"] || "2023-06-01";
  }
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers[k] = v;
  }
}

function normalizeCustomBaseUrl(raw: unknown): string {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return s;
  } catch {
    return "";
  }
}

function buildOpenAiEndpoints(cleanBase: string): { chatUrl: string; modelsUrl: string } {
  if (/\/chat\/completions$/i.test(cleanBase)) {
    return {
      chatUrl: cleanBase,
      modelsUrl: cleanBase.replace(/\/chat\/completions$/i, "/models"),
    };
  }
  if (
    /\/v\d+(?:beta\d*)?$/i.test(cleanBase) ||
    /\/openai\/v\d+$/i.test(cleanBase) ||
    /\/api\/v\d+$/i.test(cleanBase)
  ) {
    return {
      chatUrl: `${cleanBase}/chat/completions`,
      modelsUrl: `${cleanBase}/models`,
    };
  }
  return {
    chatUrl: `${cleanBase}/v1/chat/completions`,
    modelsUrl: `${cleanBase}/v1/models`,
  };
}

function buildAnthropicEndpoints(cleanBase: string): { messagesUrl: string; modelsUrl: string } {
  if (/\/messages$/i.test(cleanBase)) {
    return {
      messagesUrl: cleanBase,
      modelsUrl: cleanBase.replace(/\/messages$/i, "/models?limit=1"),
    };
  }
  if (/\/v\d+$/i.test(cleanBase)) {
    return {
      messagesUrl: `${cleanBase}/messages`,
      modelsUrl: `${cleanBase}/models?limit=1`,
    };
  }
  return {
    messagesUrl: `${cleanBase}/v1/messages`,
    modelsUrl: `${cleanBase}/v1/models?limit=1`,
  };
}

function buildGeminiCustomUrl(
  cleanBase: string,
  model: string,
  action: "generateContent" | "streamGenerateContent",
  apiKey: string,
  useHeaderAuth: boolean
): string {
  let base = cleanBase.replace(/:(?:streamGenerateContent|generateContent).*$/i, "");
  if (!base.includes(`/models/${model}`) && !/\/models\/[^/]+$/i.test(base)) {
    base = /\/models$/i.test(base)
      ? `${base}/${encodeURIComponent(model)}`
      : `${base}/models/${encodeURIComponent(model)}`;
  }
  const params: string[] = [];
  if (action === "streamGenerateContent") params.push("alt=sse");
  if (!useHeaderAuth) params.push(`key=${encodeURIComponent(apiKey)}`);
  return `${base}:${action}${params.length ? "?" + params.join("&") : ""}`;
}

async function parseErrorMessage(
  resp: globalThis.Response,
  fallbackLabel: string
): Promise<{ message: string; isHtmlOrProxyBlock: boolean }> {
  const text = await resp.text().catch(() => "");
  const trimmed = text.trim();
  if (trimmed) {
    try {
      const errData = JSON.parse(trimmed) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof errData?.error === "string") {
        return { message: errData.error, isHtmlOrProxyBlock: false };
      }
      if (errData?.error && typeof errData.error === "object" && errData.error.message) {
        return { message: errData.error.message, isHtmlOrProxyBlock: false };
      }
      if (errData?.message) {
        return { message: errData.message, isHtmlOrProxyBlock: false };
      }
    } catch {
      const looksHtml = /^<!doctype|^<html|cloudflare|attention required|just a moment/i.test(trimmed);
      return {
        message: looksHtml
          ? `${fallbackLabel} container network blocked (${resp.status})`
          : trimmed.slice(0, 220),
        isHtmlOrProxyBlock: looksHtml,
      };
    }
  }
  return { message: `${fallbackLabel} error (${resp.status})`, isHtmlOrProxyBlock: resp.status >= 500 };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Supabase public client config (public URL + publishable/anon key only, never service_role)
  app.get("/api/supabase-config", (_req: Request, res: Response) => {
    const url = String(
      process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "https://lqzdochhwqqghekobjdu.supabase.co"
    ).trim();
    const key = String(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        "sb_publishable_iP83PhH0tl8yrs2W3GcEwQ_MSgALnXY"
    ).trim();
    res.setHeader("Cache-Control", "no-store");
    res.json({ url, key, anonKey: key, configured: Boolean(url && key) });
  });

  // Fast server-side API key connectivity verification (built-in, Vertex AQ.*, Groq fallback, Custom APIs)
  app.post("/api/ai/test", async (req: Request, res: Response) => {
    const provider = normalizeProvider(req.body?.provider);
    const apiKey = String(req.body?.apiKey || "").trim();
    const model = String(req.body?.model || "").trim();
    const rawBaseUrl = String(req.body?.baseUrl || "").trim();
    const baseUrl = rawBaseUrl ? normalizeCustomBaseUrl(rawBaseUrl) : "";
    const apiFormat = resolveApiFormat(provider, req.body?.apiFormat);
    const authHeader = String(req.body?.authHeader || "").trim();
    const authPrefix = String(req.body?.authPrefix ?? "").trim();
    const extraHeaders = parseExtraHeaders(req.body?.extraHeaders);

    if (!provider || !apiKey) {
      res.status(400).json({ ok: false, error: "Missing provider or API key." });
      return;
    }
    if (rawBaseUrl && !baseUrl) {
      res.status(400).json({ ok: false, error: "Invalid Base URL (must start with http:// or https://)." });
      return;
    }
    if (provider === "custom" && !baseUrl) {
      res.status(400).json({ ok: false, error: "Custom API requires a valid Base URL." });
      return;
    }

    const started = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);

    try {
      let resp: globalThis.Response;
      const isBuiltInDefault =
        !baseUrl && !authHeader && Object.keys(extraHeaders).length === 0 && provider !== "custom";

      if (isBuiltInDefault && provider === "gemini") {
        const gemModel = model || "gemini-3.8-flash";
        if (apiKey.startsWith("AQ.")) {
          const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(
            gemModel
          )}:generateContent?key=${encodeURIComponent(apiKey)}`;
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "ok" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
            signal: ctrl.signal,
          });
        } else {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            gemModel
          )}:generateContent?key=${encodeURIComponent(apiKey)}`;
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "ok" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
            signal: ctrl.signal,
          });
        }
        if (!resp.ok) {
          const err = await parseErrorMessage(resp, "Gemini API");
          res.status(resp.status).json({
            ok: false,
            error: err.message,
            retryDirect: err.isHtmlOrProxyBlock || resp.status >= 500,
          });
          return;
        }
      } else if (
        isBuiltInDefault &&
        (provider === "openai" || provider === "groq" || provider === "deepseek" || provider === "openrouter")
      ) {
        const modelsEndpoints: Record<string, string> = {
          openai: "https://api.openai.com/v1/models",
          groq: "https://api.groq.com/openai/v1/models",
          deepseek: "https://api.deepseek.com/models",
          openrouter: "https://openrouter.ai/api/v1/auth/key",
        };
        const chatEndpoints: Record<string, string> = {
          openai: "https://api.openai.com/v1/chat/completions",
          groq: "https://api.groq.com/openai/v1/chat/completions",
          deepseek: "https://api.deepseek.com/chat/completions",
          openrouter: "https://openrouter.ai/api/v1/chat/completions",
        };
        const defaultTestModels: Record<string, string> = {
          openai: "gpt-4o-mini",
          groq: "llama-3.1-8b-instant",
          deepseek: "deepseek-chat",
          openrouter: "openrouter/auto",
        };
        const headers: Record<string, string> = {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json",
          "User-Agent": UPSTREAM_USER_AGENT,
        };
        if (provider === "openrouter") {
          headers["X-Title"] = "My Apps Hub";
        }
        resp = await fetch(modelsEndpoints[provider], {
          method: "GET",
          headers,
          signal: ctrl.signal,
        });
        if (resp.status === 404 || resp.status === 405 || (provider === "groq" && resp.status === 403)) {
          resp = await fetch(chatEndpoints[provider], {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model || defaultTestModels[provider],
              max_tokens: 1,
              messages: [{ role: "user", content: "hi" }],
            }),
            signal: ctrl.signal,
          });
        }
        if (!resp.ok) {
          const err = await parseErrorMessage(resp, provider.toUpperCase());
          res.status(resp.status).json({
            ok: false,
            error: err.message,
            retryDirect: err.isHtmlOrProxyBlock || resp.status === 403 || resp.status >= 500,
          });
          return;
        }
      } else if (isBuiltInDefault && provider === "claude") {
        const headers: Record<string, string> = {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          Accept: "application/json",
          "User-Agent": UPSTREAM_USER_AGENT,
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
              model: model || "claude-sonnet-4-20250514",
              max_tokens: 1,
              messages: [{ role: "user", content: "hi" }],
            }),
            signal: ctrl.signal,
          });
        }
        if (!resp.ok) {
          const err = await parseErrorMessage(resp, "Claude API");
          res.status(resp.status).json({
            ok: false,
            error: err.message,
            retryDirect: err.isHtmlOrProxyBlock || resp.status >= 500,
          });
          return;
        }
      } else {
        const resolvedBase =
          provider === "gemini" &&
          apiKey.startsWith("AQ.") &&
          baseUrl === "https://generativelanguage.googleapis.com/v1beta"
            ? "https://aiplatform.googleapis.com/v1/publishers/google"
            : baseUrl;
        const effectiveBase =
          resolvedBase ||
          (provider === "groq"
            ? "https://api.groq.com/openai/v1"
            : provider === "deepseek"
            ? "https://api.deepseek.com"
            : provider === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : provider === "claude"
            ? "https://api.anthropic.com/v1"
            : provider === "gemini"
            ? apiKey.startsWith("AQ.")
              ? "https://aiplatform.googleapis.com/v1/publishers/google"
              : "https://generativelanguage.googleapis.com/v1beta"
            : "https://api.openai.com/v1");

        const headers: Record<string, string> = {
          Accept: "application/json",
          "User-Agent": UPSTREAM_USER_AGENT,
        };
        applyCustomAuthHeaders(headers, apiKey, apiFormat, authHeader, authPrefix, extraHeaders);

        if (apiFormat === "gemini") {
          const testModel = model || "gemini-3.8-flash";
          const url = buildGeminiCustomUrl(effectiveBase, testModel, "generateContent", apiKey, Boolean(authHeader));
          resp = await fetch(url, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "ok" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
            signal: ctrl.signal,
          });
        } else if (apiFormat === "anthropic") {
          const { messagesUrl, modelsUrl } = buildAnthropicEndpoints(effectiveBase);
          resp = await fetch(modelsUrl, { method: "GET", headers, signal: ctrl.signal });
          if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
            resp = await fetch(messagesUrl, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: model || "claude-sonnet-4-20250514",
                max_tokens: 1,
                messages: [{ role: "user", content: "hi" }],
              }),
              signal: ctrl.signal,
            });
          }
        } else {
          const { chatUrl, modelsUrl } = buildOpenAiEndpoints(effectiveBase);
          resp = await fetch(modelsUrl, { method: "GET", headers, signal: ctrl.signal });
          if (
            resp.status === 404 ||
            resp.status === 405 ||
            resp.status === 501 ||
            (provider === "groq" && resp.status === 403)
          ) {
            resp = await fetch(chatUrl, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: model || (provider === "groq" ? "llama-3.1-8b-instant" : "gpt-4o-mini"),
                max_tokens: 1,
                messages: [{ role: "user", content: "hi" }],
              }),
              signal: ctrl.signal,
            });
          }
        }

        if (!resp.ok) {
          const err = await parseErrorMessage(resp, provider === "custom" ? "Custom API" : provider.toUpperCase());
          res.status(resp.status).json({
            ok: false,
            error: err.message,
            retryDirect: err.isHtmlOrProxyBlock || resp.status >= 500,
          });
          return;
        }
      }

      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      res.json({ ok: true, latencyMs });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError") {
        res.status(504).json({ ok: false, retryDirect: true, error: "Connection timed out (9.0s)" });
        return;
      }
      res.status(502).json({ ok: false, retryDirect: true, error: e?.message || "Network error" });
    } finally {
      clearTimeout(timer);
    }
  });

  // Streaming & non-streaming AI chat proxy (supports built-in, Vertex AQ.*, and Custom APIs)
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    const provider = normalizeProvider(req.body?.provider);
    const apiKey = String(req.body?.apiKey || "").trim();
    const defaultChatModels: Record<string, string> = {
      gemini: "gemini-3.8-flash",
      openai: "gpt-4o-mini",
      claude: "claude-sonnet-4-20250514",
      groq: "llama-3.3-70b-versatile",
      deepseek: "deepseek-chat",
      openrouter: "openrouter/auto",
      custom: "gpt-4o-mini",
    };
    const model = String(req.body?.model || "").trim() || defaultChatModels[provider] || "gemini-3.8-flash";
    const rawBaseUrl = String(req.body?.baseUrl || "").trim();
    const baseUrl = rawBaseUrl ? normalizeCustomBaseUrl(rawBaseUrl) : "";
    const apiFormat = resolveApiFormat(provider, req.body?.apiFormat);
    const authHeader = String(req.body?.authHeader || "").trim();
    const authPrefix = String(req.body?.authPrefix ?? "").trim();
    const extraHeaders = parseExtraHeaders(req.body?.extraHeaders);

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
    if (rawBaseUrl && !baseUrl) {
      res.status(400).json({ error: { message: "Invalid Base URL (must start with http:// or https://)." } });
      return;
    }
    if (provider === "custom" && !baseUrl) {
      res.status(400).json({ error: { message: "Custom API requires a valid Base URL." } });
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

      if (apiFormat === "gemini") {
        const action = wantsStream ? "streamGenerateContent" : "generateContent";
        const defaultBase = apiKey.startsWith("AQ.")
          ? "https://aiplatform.googleapis.com/v1/publishers/google"
          : "https://generativelanguage.googleapis.com/v1beta";
        const resolvedBase =
          provider === "gemini" &&
          apiKey.startsWith("AQ.") &&
          baseUrl === "https://generativelanguage.googleapis.com/v1beta"
            ? "https://aiplatform.googleapis.com/v1/publishers/google"
            : baseUrl;
        const effectiveBase = resolvedBase || defaultBase;
        const useHeaderAuth = Boolean(authHeader);
        const url = buildGeminiCustomUrl(effectiveBase, model, action, apiKey, useHeaderAuth);

        const contents = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: Array.isArray(m.parts) && m.parts.length > 0 ? m.parts : [{ text: String(m.content || "") }],
        }));
        const generationConfig: Record<string, unknown> = { temperature: 0.7 };
        if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
        if (req.body?.responseMimeType) {
          generationConfig.responseMimeType = String(req.body.responseMimeType);
        }
        if (fastMode) {
          if (model.includes("2.5")) {
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
          } else if (model.includes("gemini-3") || model.includes("gemini-4")) {
            generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
          }
        }
        const body: Record<string, unknown> = { contents, generationConfig };
        if (systemPrompt) {
          body.systemInstruction = { parts: [{ text: systemPrompt }] };
        }
        if (useSearchGrounding) {
          body.tools = [{ google_search: {} }];
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: wantsStream ? "text/event-stream, application/json" : "application/json",
        };
        applyCustomAuthHeaders(headers, apiKey, "gemini", authHeader, authPrefix, extraHeaders);

        upstreamResp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!upstreamResp.ok && upstreamResp.status === 400 && generationConfig.thinkingConfig) {
          delete generationConfig.thinkingConfig;
          upstreamResp = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        }
        if (!upstreamResp.ok && useSearchGrounding) {
          delete body.tools;
          upstreamResp = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        }
      } else if (apiFormat === "anthropic") {
        const effectiveBase = baseUrl || "https://api.anthropic.com/v1";
        const { messagesUrl } = buildAnthropicEndpoints(effectiveBase);
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

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: wantsStream ? "text/event-stream, application/json" : "application/json",
          "User-Agent": UPSTREAM_USER_AGENT,
        };
        applyCustomAuthHeaders(headers, apiKey, "anthropic", authHeader, authPrefix, extraHeaders);

        upstreamResp = await fetch(messagesUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
      } else {
        let endpoint = "https://api.openai.com/v1/chat/completions";
        if (baseUrl) {
          endpoint = buildOpenAiEndpoints(baseUrl).chatUrl;
        } else if (provider === "groq") {
          endpoint = "https://api.groq.com/openai/v1/chat/completions";
        } else if (provider === "deepseek") {
          endpoint = "https://api.deepseek.com/chat/completions";
        } else if (provider === "openrouter") {
          endpoint = "https://openrouter.ai/api/v1/chat/completions";
        }

        const apiMessages: AiMessage[] = [];
        if (systemPrompt) apiMessages.push({ role: "system", content: systemPrompt });
        for (const m of messages) {
          apiMessages.push({ role: String(m.role || "user"), content: String(m.content || "") });
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: wantsStream ? "text/event-stream, application/json" : "application/json",
          "User-Agent": UPSTREAM_USER_AGENT,
        };
        if (provider === "openrouter" && !baseUrl) {
          headers["X-Title"] = "My Apps Hub";
        }
        applyCustomAuthHeaders(headers, apiKey, "openai", authHeader, authPrefix, extraHeaders);

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
      }

      if (!upstreamResp.ok) {
        const parsedErr = await parseErrorMessage(upstreamResp, provider.toUpperCase());
        res.status(upstreamResp.status);
        res.setHeader("Content-Type", "application/json");
        res.json({
          error: { message: parsedErr.message },
          retryDirect:
            parsedErr.isHtmlOrProxyBlock ||
            upstreamResp.status >= 500 ||
            (provider === "groq" && upstreamResp.status === 403),
        });
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
        res.status(502).json({ retryDirect: true, error: { message: e?.message || "Upstream proxy error" } });
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
