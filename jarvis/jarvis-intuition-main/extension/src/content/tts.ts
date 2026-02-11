// Text-to-speech using browser speechSynthesis API

let currentUtterance: SpeechSynthesisUtterance | null = null;
let lastSpokenText: string = '';
let speechRate: number = 1.0;
let onSpeechFinished: (() => void) | null = null;

/** Register a callback for when TTS finishes speaking (for continuous conversation mode) */
export function setOnSpeechFinished(callback: (() => void) | null): void {
  onSpeechFinished = callback;
}

// Initialize TTS
export function initTTS(): boolean {
  if (!('speechSynthesis' in window)) {
    console.error('[TTS] Speech synthesis not supported');
    return false;
  }
  
  // Preload voices
  speechSynthesis.getVoices();
  
  return true;
}

// Get best available voice
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  
  // Prefer English voices
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // Prefer Google or Microsoft voices if available
  const preferredVoice = englishVoices.find(v => 
    v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')
  );
  
  if (preferredVoice) return preferredVoice;
  if (englishVoices.length > 0) return englishVoices[0];
  if (voices.length > 0) return voices[0];
  
  return null;
}

// Speak text
export function speak(text: string, priority: 'high' | 'normal' = 'normal'): void {
  // Handle special commands
  if (text === 'stop_speaking') {
    stopSpeaking();
    return;
  }
  
  if (text === 'repeat_last') {
    if (lastSpokenText) {
      speak(lastSpokenText, priority);
    }
    return;
  }
  
  // Cancel current speech if high priority or new utterance
  if (priority === 'high' || speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice
  const voice = getBestVoice();
  if (voice) {
    utterance.voice = voice;
  }
  
  // Set properties
  utterance.rate = speechRate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Store for repeat functionality
  lastSpokenText = text;
  currentUtterance = utterance;
  
  // Event handlers
  utterance.onstart = () => {
    console.log('[TTS] Speaking:', text.substring(0, 50) + '...');
  };
  
  utterance.onend = () => {
    console.log('[TTS] Finished speaking');
    currentUtterance = null;
    // Notify for continuous conversation mode
    onSpeechFinished?.();
  };
  
  utterance.onerror = (event) => {
    console.error('[TTS] Error:', event.error);
    currentUtterance = null;
  };
  
  // Speak
  speechSynthesis.speak(utterance);
}

// Stop speaking
export function stopSpeaking(): void {
  speechSynthesis.cancel();
  currentUtterance = null;
}

// Check if currently speaking
export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

// Adjust speech rate
export function setSpeechRate(rate: number): void {
  speechRate = Math.max(0.5, Math.min(2.0, rate));
  console.log('[TTS] Speech rate set to:', speechRate);
}

// Slow down speech
export function slowDown(): void {
  speechRate = Math.max(0.5, speechRate - 0.2);
  speak(`Speaking at ${Math.round(speechRate * 100)} percent speed.`, 'high');
}

// Speed up speech
export function speedUp(): void {
  speechRate = Math.min(2.0, speechRate + 0.2);
}

// Get last spoken text
export function getLastSpokenText(): string {
  return lastSpokenText;
}
