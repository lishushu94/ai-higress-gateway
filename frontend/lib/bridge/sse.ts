"use client";

import { tokenManager } from "@/lib/auth/token-manager";
import { API_BASE_URL } from "@/http/client";

export type SSEMessage = {
  event: string;
  data: string;
};

export async function streamSSE(
  url: string,
  onMessage: (msg: SSEMessage) => void,
  signal: AbortSignal
): Promise<void> {
  const resp = await streamSSEFetch(url, { method: "GET" }, signal);
  if (!resp.ok || !resp.body) {
    throw new Error(`SSE failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const msg = parseSSEFrame(frame);
      if (msg) onMessage(msg);
    }
  }
}

export async function streamSSERequest(
  url: string,
  init: Omit<RequestInit, "signal">,
  onMessage: (msg: SSEMessage) => void,
  signal: AbortSignal
): Promise<void> {
  const resp = await streamSSEFetch(url, init, signal);
  if (!resp.ok || !resp.body) {
    throw new Error(`SSE failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const msg = parseSSEFrame(frame);
      if (msg) onMessage(msg);
    }
  }
}

async function streamSSEFetch(
  url: string,
  init: Omit<RequestInit, "signal">,
  signal: AbortSignal
): Promise<Response> {
  const token = tokenManager.getAccessToken();
  const baseUrl = API_BASE_URL || "";

  const resolvedUrl = resolveApiUrl(url, baseUrl);

  const mergedHeaders: Record<string, string> = {};
  const initHeaders = init.headers as Record<string, string> | Headers | undefined;

  if (initHeaders instanceof Headers) {
    initHeaders.forEach((value, key) => {
      mergedHeaders[key] = value;
    });
  } else if (initHeaders && typeof initHeaders === "object") {
    Object.assign(mergedHeaders, initHeaders);
  }

  const hasAuthHeader = Object.keys(mergedHeaders).some(
    (key) => key.toLowerCase() === "authorization"
  );
  if (!hasAuthHeader && token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const hasAnyAuth = Object.keys(mergedHeaders).some((key) => {
    const lower = key.toLowerCase();
    return lower === "authorization" || lower === "x-api-key";
  });
  if (!hasAnyAuth && typeof window !== "undefined") {
    const apiKey = localStorage.getItem("api_key");
    if (apiKey) {
      mergedHeaders["X-API-Key"] = apiKey;
    }
  }

  return fetch(resolvedUrl, { ...init, headers: mergedHeaders, signal });
}

function resolveApiUrl(url: string, baseUrl: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const base = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return trimmed;

  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
}

function parseSSEFrame(frame: string): SSEMessage | null {
  const lines = frame.split("\n");
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice("data:".length).trim();
    }
  }
  if (!data) return null;
  return { event, data };
}
