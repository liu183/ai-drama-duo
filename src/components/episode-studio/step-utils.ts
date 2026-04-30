import type { Episode, Character, Storyboard } from '@/types';

export type StepStatus = 'done' | 'active' | 'pending';

export function getStepStatus(
  stepKey: string,
  episode: Episode,
  characters: Character[],
  storyboards: Storyboard[]
): StepStatus {
  switch (stepKey) {
    case 'raw_content':
      return episode.content ? 'done' : 'pending';
    case 'script_rewrite':
      return episode.scriptContent ? 'done' : 'pending';
    case 'character_extract':
      return characters.length > 0 ? 'done' : 'pending';
    case 'voice_assign':
      return characters.some(c => c.voiceStyle) ? 'done' : 'pending';
    case 'storyboard':
      return storyboards.length > 0 ? 'done' : 'pending';
    case 'image_gen':
      return storyboards.length > 0 && storyboards.every(s => s.imagePrompt) ? 'done' : 'pending';
    case 'video_gen':
      return storyboards.length > 0 && storyboards.every(s => s.videoPrompt) ? 'done' : 'pending';
    case 'tts':
      return storyboards.length > 0 && storyboards.some(s => s.ttsAudioUrl) ? 'done' : 'pending';
    case 'compose':
      return storyboards.length > 0 && storyboards.every(s => s.composedVideoUrl) ? 'done' : 'pending';
    case 'merge':
      return episode.status === 'merged' ? 'done' : 'pending';
    case 'export':
      return episode.status === 'merged' ? 'done' : 'pending';
    default:
      return 'pending';
  }
}
