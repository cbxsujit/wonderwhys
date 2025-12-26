
export interface DiscoveryResult {
  question: string;
  explanation: string;
  imageUrl?: string;
  audioData?: string; // base64
}

export interface AppState {
  isThinking: boolean;
  isAudioLoading: boolean;
  currentResult: DiscoveryResult | null;
  error: string | null;
  history: DiscoveryResult[];
}
