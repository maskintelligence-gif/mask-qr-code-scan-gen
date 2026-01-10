export interface ScanResult {
  id: string;
  data: string;
  timestamp: number;
  type: 'url' | 'text' | 'wifi' | 'email' | 'other';
  aiSummary?: string;
  aiLoading?: boolean;
  originalImage?: string;
}

export type Tab = 'scan' | 'generate' | 'history';

export interface GeneratedQR {
  id: string;
  data: string;
  timestamp: number;
  base64: string;
}

export interface GeminiAnalysis {
  summary: string;
  safetyRating: 'safe' | 'caution' | 'unknown';
  category: string;
  actions: string[];
}