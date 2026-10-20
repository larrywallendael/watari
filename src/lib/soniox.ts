// Soniox server helpers. The long-lived key (SONIOX_API_KEY) never leaves the server.
// Docs (Oct 2026): temporary keys  POST https://api.soniox.com/v1/auth/temporary-api-key
//                  STT websocket   wss://stt-rt.soniox.com/transcribe-websocket (model stt-rt-v5)
//                  TTS REST        POST https://tts-rt.soniox.com/tts (model tts-rt-v2)
export const SONIOX = {
  tokenUrl: "https://api.soniox.com/v1/auth/temporary-api-key",
  ttsUrl: "https://tts-rt.soniox.com/tts",
  sttModel: process.env.SONIOX_STT_MODEL || "stt-rt-v5",
  ttsModel: process.env.SONIOX_TTS_MODEL || "tts-rt-v2",
  // Adrian: "deep, focused male voice, crisp articulation, measured pacing, composed tone"
  ttsVoice: process.env.SONIOX_TTS_VOICE || "Adrian",
};

export const hasSoniox = () => !!process.env.SONIOX_API_KEY;

export async function mintTempKey(usage: "transcribe_websocket" | "tts_rt", seconds = 3600) {
  const r = await fetch(SONIOX.tokenUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SONIOX_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ usage_type: usage, expires_in_seconds: Math.min(3600, Math.max(60, seconds)), client_reference_id: "watari2-d1" }),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`soniox token ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { api_key: string; expires_at: string };
  return j;
}

// In-memory cache per text (per server instance). Scripted lines are tiny, so this stays small.
const cache = new Map<string, { buf: ArrayBuffer; type: string; t: number }>();
const inflight = new Map<string, Promise<{ buf: ArrayBuffer; type: string }>>();

export async function synth(text: string): Promise<{ buf: ArrayBuffer; type: string; cached: boolean }> {
  const key = `${SONIOX.ttsModel}|${SONIOX.ttsVoice}|${text}`;
  const hit = cache.get(key);
  if (hit) return { buf: hit.buf, type: hit.type, cached: true };
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      const r = await fetch(SONIOX.ttsUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SONIOX_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: SONIOX.ttsModel, voice: SONIOX.ttsVoice, language: "en", audio_format: "mp3", sample_rate: 24000, bitrate: 128000, text }),
        signal: AbortSignal.timeout(8000),
      });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || type.includes("json")) throw new Error(`soniox tts ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 200) throw new Error("soniox tts: empty audio");
      return { buf, type: type || "audio/mpeg" };
    })();
    inflight.set(key, p);
  }
  try {
    const v = await p;
    cache.set(key, { ...v, t: Date.now() });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return { ...v, cached: false };
  } finally {
    inflight.delete(key);
  }
}
