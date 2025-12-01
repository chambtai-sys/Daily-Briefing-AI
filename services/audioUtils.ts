import { MusicStyle } from "../types";

/**
 * Decodes a base64 string into a raw byte array.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data into an AudioBuffer.
 * The Gemini TTS API returns raw PCM (Int16) at 24kHz.
 */
export async function decodeAudioData(
  base64Data: string,
  ctx: BaseAudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const bytes = decodeBase64(base64Data);
  const dataInt16 = new Int16Array(bytes.buffer);
  
  // Calculate duration
  const frameCount = dataInt16.length / numChannels;
  
  // Create buffer
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encodes an AudioBuffer to a WAV format Blob.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, numChannels, sampleRate, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number, bitDepth: number) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Creates a WAV file Blob URL from raw PCM data.
 * Used for simple playback without mixing.
 */
export function createWavUrl(base64Data: string, sampleRate: number = 24000): string {
  const bytes = decodeBase64(base64Data);
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, bytes.length, true);

  const blob = new Blob([view, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Synthesizes a background track based on style and duration.
 */
function generateBackgroundTrack(
  ctx: BaseAudioContext, 
  style: MusicStyle, 
  duration: number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
  
  if (style === MusicStyle.NO_MUSIC) return buffer;

  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);

  // Helper for synthesis
  const t = (i: number) => i / sampleRate;

  for (let i = 0; i < buffer.length; i++) {
    const time = t(i);
    let sampleL = 0;
    let sampleR = 0;

    if (style === MusicStyle.CALM) {
      // Gentle Ambient Drone (Sine waves at harmonic intervals)
      // Fundamental D3 (146.83) + A3 (220)
      const f1 = 146.83;
      const f2 = 220.00;
      
      // Add slow modulation
      const mod = Math.sin(time * 0.2) * 0.5 + 0.5; 
      
      sampleL = Math.sin(2 * Math.PI * f1 * time) * 0.1 * mod;
      sampleR = Math.sin(2 * Math.PI * f2 * time) * 0.1 * (1 - mod);
      
      // Add some 'air'/noise
      sampleL += (Math.random() * 2 - 1) * 0.005;
      sampleR += (Math.random() * 2 - 1) * 0.005;

    } else if (style === MusicStyle.UPBEAT) {
      // Simple Pulse / Techno
      // Bass pulse
      const bpm = 120;
      const beatLen = 60 / bpm;
      const beatPos = time % beatLen;
      
      // Kick-ish thud
      let kick = 0;
      if (beatPos < 0.1) {
         kick = Math.sin(2 * Math.PI * 60 * beatPos) * Math.exp(-20 * beatPos);
      }

      // High hat shaker
      let hat = 0;
      if (time % (beatLen/2) < 0.05) {
        hat = (Math.random() * 2 - 1) * 0.1;
      }

      // Synth chord pulse
      const chord = Math.sin(2 * Math.PI * 220 * time) + Math.sin(2 * Math.PI * 330 * time);
      const gate = Math.sin(2 * Math.PI * (bpm/60 * 2) * time) > 0 ? 1 : 0;
      
      sampleL = kick * 0.4 + hat + (chord * 0.05 * gate);
      sampleR = kick * 0.4 + hat + (chord * 0.05 * (1-gate));

    } else if (style === MusicStyle.FOCUS) {
      // Binaural-ish pure tones
      // 200Hz vs 205Hz
      sampleL = Math.sin(2 * Math.PI * 200 * time) * 0.1;
      sampleR = Math.sin(2 * Math.PI * 204 * time) * 0.1;
    }

    // Fade in/out edges to prevent clicks
    let envelope = 1;
    if (time < 0.5) envelope = time / 0.5;
    if (time > duration - 1.5) envelope = (duration - time) / 1.5;
    envelope = Math.max(0, envelope);

    L[i] = sampleL * envelope;
    R[i] = sampleR * envelope;
  }

  return buffer;
}

/**
 * Mixes TTS voice data with generated background music.
 */
export async function mixAudioWithMusic(
  voiceBase64: string,
  musicStyle: MusicStyle
): Promise<string> {
  // If no music, just return the simple WAV url
  if (musicStyle === MusicStyle.NO_MUSIC) {
    return createWavUrl(voiceBase64);
  }

  // 1. Decode Voice
  // Note: OfflineAudioContext usually runs at 44100 or 48000. 
  // We need to decode the 24000Hz PCM into this context.
  const offlineCtx = new OfflineAudioContext(2, 44100 * 1, 44100); // Temp context to get factory
  const voiceBuffer = await decodeAudioData(voiceBase64, offlineCtx, 24000);
  
  const duration = voiceBuffer.duration;
  
  // 2. Setup Rendering Context
  // Create a context exactly the length of the voice
  const renderCtx = new OfflineAudioContext(2, duration * 44100, 44100);
  
  // 3. Prepare Voice Source
  const voiceSource = renderCtx.createBufferSource();
  voiceSource.buffer = voiceBuffer;
  voiceSource.connect(renderCtx.destination);
  
  // 4. Generate & Prepare Music Source
  const musicBuffer = generateBackgroundTrack(renderCtx, musicStyle, duration);
  const musicSource = renderCtx.createBufferSource();
  musicSource.buffer = musicBuffer;
  
  // Add gain to music to keep it subtle
  const musicGain = renderCtx.createGain();
  musicGain.gain.value = 0.6; // Background level
  
  musicSource.connect(musicGain);
  musicGain.connect(renderCtx.destination);
  
  // 5. Start
  voiceSource.start(0);
  musicSource.start(0);
  
  // 6. Render
  const renderedBuffer = await renderCtx.startRendering();
  
  // 7. Convert to Blob URL
  const wavBlob = audioBufferToWav(renderedBuffer);
  return URL.createObjectURL(wavBlob);
}