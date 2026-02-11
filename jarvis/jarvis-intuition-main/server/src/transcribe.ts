import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI();

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Create a temporary file for the audio
  const tempDir = '/tmp';
  const extension = mimeType.includes('webm') ? 'webm' : 
                    mimeType.includes('wav') ? 'wav' : 
                    mimeType.includes('mp3') ? 'mp3' : 'webm';
  const tempFile = path.join(tempDir, `audio_${Date.now()}.${extension}`);
  
  try {
    // Write buffer to temp file
    fs.writeFileSync(tempFile, audioBuffer);
    
    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });
    
    console.log('[Transcribe] Result:', transcription);
    return transcription.trim();
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    throw error;
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Detect confirmation phrases in transcript
export function detectConfirmation(transcript: string): 'confirm' | 'cancel' | null {
  const lower = transcript.toLowerCase().trim();
  
  const confirmPhrases = [
    'confirm', 'yes', 'proceed', 'go ahead', 'do it', 
    'yes please', 'that\'s right', 'correct', 'affirmative',
    'yes confirm', 'confirmed', 'approve', 'ok', 'okay'
  ];
  
  const cancelPhrases = [
    'cancel', 'no', 'stop', 'don\'t', 'abort', 'nevermind',
    'never mind', 'wait', 'hold on', 'not yet', 'no thanks'
  ];
  
  for (const phrase of confirmPhrases) {
    if (lower.includes(phrase)) {
      return 'confirm';
    }
  }
  
  for (const phrase of cancelPhrases) {
    if (lower.includes(phrase)) {
      return 'cancel';
    }
  }
  
  return null;
}

// Detect special voice commands
export function detectSpecialCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  
  const commands: Record<string, string[]> = {
    'repeat': ['repeat', 'say again', 'what did you say', 'pardon'],
    'slower': ['slower', 'slow down', 'speak slower', 'too fast'],
    'stop': ['stop', 'quiet', 'shut up', 'be quiet', 'silence'],
    'where_am_i': ['where am i', 'what page', 'current page', 'what site'],
    'what_can_i_do': ['what can i do', 'available actions', 'what are my options', 'help me', 'what\'s available'],
    'go_back': ['go back', 'previous page', 'back']
  };
  
  for (const [command, phrases] of Object.entries(commands)) {
    for (const phrase of phrases) {
      if (lower.includes(phrase)) {
        return command;
      }
    }
  }
  
  return null;
}
