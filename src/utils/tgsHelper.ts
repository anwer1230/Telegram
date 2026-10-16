/**
 * tgsHelper.ts - Telegram Animated Sticker (.tgs) Decompressor & Parser
 * Converts Telegram .tgs binary streams (gzip compressed Lottie) into standard JSON objects
 * utilizing native browser DecompressionStream for zero-latency 60FPS vector animation.
 */

export async function decompressTgsBuffer(buffer: ArrayBuffer | Uint8Array): Promise<any> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(buffer);
      writer.close();
      const response = new Response(ds.readable);
      const text = await response.text();
      return JSON.parse(text);
    } catch (e) {
      console.warn('[tgsHelper] Native gzip decompression failed:', e);
    }
  }

  // TextDecoder fallback if already uncompressed JSON
  try {
    const text = new TextDecoder('utf-8').decode(buffer);
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Could not parse TGS / Lottie data');
  }
}

export async function loadTgsFromUrl(url: string): Promise<any> {
  const resp = await fetch(url);
  const arrayBuffer = await resp.arrayBuffer();
  return await decompressTgsBuffer(arrayBuffer);
}
