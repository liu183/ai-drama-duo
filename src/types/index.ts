// ==================== Drama Types ====================

export interface DramaItem {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  totalEpisodes: number;
  totalDuration: number;
  status: string;
  thumbnail: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  episodes?: { id: string; status: string }[];
  characters?: { id: string }[];
  scenes?: { id: string }[];
  _count?: { episodes: number; characters: number; scenes: number };
}

export interface DramaDetail extends DramaItem {
  episodes?: Episode[];
  characters?: Character[];
  scenes?: Scene[];
  metadata?: string;
}

// ==================== Episode Types ====================

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  content: string;
  scriptContent: string;
  status: string;
  duration: number;
  dramaId?: string;
}

// ==================== Character Types ====================

export interface CharacterAppearance {
  text?: string;
  gender?: string;
  ageRange?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinTone?: string;
  bodyType?: string;
  clothing?: string;
  distinguishing?: string;
  promptEn?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  appearance: string;
  personality: string;
  voiceStyle: string;
  voiceProvider: string;
  imageUrl: string;
  referenceImages?: string;
  seedValue?: string;
  sortOrder?: number;
}

// ==================== Scene Types ====================

export interface ScenePrompt {
  text?: string;
  environmentType?: string;
  architecturalStyle?: string;
  lighting?: string;
  weather?: string;
  season?: string;
  colorTone?: string;
  keyProps?: string;
  promptEn?: string;
}

export interface Scene {
  id: string;
  location: string;
  time: string;
  prompt: string;
  status: string;
  storyboardCount?: number;
  imageUrl?: string;
}

// ==================== Storyboard Types ====================

export interface Storyboard {
  id: string;
  storyboardNumber: number;
  title: string;
  location: string;
  time: string;
  shotType: string;
  angle: string;
  movement: string;
  action: string;
  result: string;
  atmosphere: string;
  imagePrompt: string;
  videoPrompt: string;
  dialogue: string;
  description: string;
  duration: number;
  composedImage: string;
  videoUrl: string;
  ttsAudioUrl: string;
  subtitleUrl: string;
  composedVideoUrl: string;
  status: string;
  characters?: Character[];
}

// ==================== Image Style Config ====================

export interface ImageStyleConfig {
  aspectRatio: string;
  qualityKeywords: string;
  negativePrompts: string;
  stylePromptPrefix: string;
}
