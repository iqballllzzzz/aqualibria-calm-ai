/**
 * Shared audio utilities for PCM → WAV conversion
 * Used by TTSButton and VoiceCallModal
 */

/**
 * Convert base64 PCM L16 data to a playable WAV Blob URL
 */
export const pcmToWavUrl = (base64Data: string, mimeType: string): string | null => {
  try {
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

    const numSamples = Math.floor(bytes.length / 2);
    const pcmData = new Int16Array(numSamples);

    // Gemini TTS with codec=pcm is little-endian
    const isBigEndian = mimeType.includes("L16") && !mimeType.includes("codec=pcm");
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let i = 0; i < numSamples; i++) {
      pcmData[i] = isBigEndian
        ? (bytes[i * 2] << 8) | bytes[i * 2 + 1]
        : dataView.getInt16(i * 2, true);
    }

    // Build WAV header
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("PCM to WAV conversion failed:", e);
    return null;
  }
};

/**
 * Play PCM audio using AudioContext (more reliable on mobile)
 */
export const playPcmWithAudioContext = async (
  base64Data: string,
  mimeType: string
): Promise<{ played: boolean; audioContext?: AudioContext; source?: AudioBufferSourceNode }> => {
  try {
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

    const numSamples = Math.floor(bytes.length / 2);
    const audioCtx = new AudioContext({ sampleRate });
    const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    const isBigEndian = mimeType.includes("L16") && !mimeType.includes("codec=pcm");
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let i = 0; i < numSamples; i++) {
      const sample = isBigEndian
        ? dataView.getInt16(i * 2, false)
        : dataView.getInt16(i * 2, true);
      channelData[i] = sample / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(0);

    return { played: true, audioContext: audioCtx, source };
  } catch (e) {
    console.error("AudioContext playback failed:", e);
    return { played: false };
  }
};

/**
 * Parse a PCM data URL into its components
 */
export const parsePcmDataUrl = (
  audioUrl: string
): { isPcm: boolean; mimeType: string; base64: string } => {
  const isPcm =
    audioUrl.startsWith("data:audio/L16") ||
    audioUrl.startsWith("data:audio/pcm");

  if (!isPcm) return { isPcm: false, mimeType: "", base64: "" };

  const commaIdx = audioUrl.indexOf(",");
  const meta = audioUrl.substring(5, commaIdx);
  const mimeType = meta.split(";base64")[0];
  const base64 = audioUrl.substring(commaIdx + 1);

  return { isPcm: true, mimeType, base64 };
};
