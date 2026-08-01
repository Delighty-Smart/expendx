/**
 * Lucent AI Module Types
 * 
 * Defines downloadable AI capabilities (Voice, Chat, OCR, Analytics).
 * Models range from tiny on-device WebAssembly engines to optional Cloud APIs.
 */

export type AIModuleCategory = 'chat' | 'voice' | 'ocr' | 'analytics' | 'categorization';

export type AIModuleStatus = 
  | 'available' 
  | 'downloading' 
  | 'installed' 
  | 'update_available' 
  | 'error';

export interface AIModuleDefinition {
  id: string;
  name: string;
  category: AIModuleCategory;
  tagline: string;
  description: string;
  version: string;
  /** Download size formatted string (e.g. "120 MB") */
  sizeFormatted: string;
  /** Raw download size in bytes */
  sizeBytes: number;
  /** Recommended RAM in MB */
  ramRequiredMB: number;
  /** Capabilities bullet points */
  capabilities: string[];
  /** Recommended badge */
  isRecommended?: boolean;
  /** Primary execution engine */
  engine: 'WebAssembly' | 'WebGPU' | 'Cloud Edge';
  /** Download URL for model weights */
  downloadUrl?: string;
}

export interface InstalledModuleState {
  id: string;
  status: AIModuleStatus;
  progressPercent: number;
  installedAt?: number;
  lastUsedAt?: number;
  bytesDownloaded?: number;
  errorMessage?: string;
}

export const AVAILABLE_AI_MODULES: AIModuleDefinition[] = [
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    category: 'chat',
    tagline: 'Ultra-fast 100% offline financial assistant',
    description: 'Extremely lightweight language model designed for instant offline chat, expense logging, and intent parsing on mobile devices.',
    version: '2.0.1',
    sizeFormatted: '240 MB',
    sizeBytes: 240 * 1024 * 1024,
    ramRequiredMB: 512,
    isRecommended: true,
    engine: 'WebAssembly',
    downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/resolve/main/config.json',
    capabilities: [
      '100% offline expense logging & conversation',
      'Zero internet data usage after download',
      'Private — financial queries never leave device',
      'Ultra-fast response time (<100ms)'
    ]
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny Speech',
    category: 'voice',
    tagline: 'Voice expense logging in natural language',
    description: 'On-device speech-to-text model. Speak your expenses naturally ("I just paid ₦4,500 for lunch") without typing.',
    version: '1.2.0',
    sizeFormatted: '75 MB',
    sizeBytes: 75 * 1024 * 1024,
    ramRequiredMB: 256,
    isRecommended: true,
    engine: 'WebAssembly',
    downloadUrl: 'https://huggingface.co/openai/whisper-tiny/resolve/main/config.json',
    capabilities: [
      'Offline voice-to-text transcription',
      'Accurate parsing of numbers and currencies',
      'Supports noisy background environments'
    ]
  },
  {
    id: 'paddle-ocr-tiny',
    name: 'PaddleOCR Tiny',
    category: 'ocr',
    tagline: 'Instant offline receipt & bill scanning',
    description: 'On-device computer vision model that extracts merchant names, line items, and totals from receipt photos offline.',
    version: '2.1.0',
    sizeFormatted: '18 MB',
    sizeBytes: 18 * 1024 * 1024,
    ramRequiredMB: 128,
    isRecommended: true,
    engine: 'WebAssembly',
    downloadUrl: 'https://huggingface.co/tesseract-ocr/tessdata_fast/resolve/main/eng.traineddata',
    capabilities: [
      'Extract total amount and date from photos',
      'Detect merchant name automatically',
      'Works with paper receipts & digital screenshots'
    ]
  },
  {
    id: 'gemma-4-26b-cloud',
    name: 'Gemma 4 26B (Cloud)',
    category: 'chat',
    tagline: 'Google Gemma 4 26B Cloud AI Model via OpenRouter',
    description: 'High-capability cloud LLM model for natural language, deep financial planning, and conversational intelligence. Powered by OpenRouter free tier.',
    version: '4.0.0',
    sizeFormatted: '0 MB (Cloud)',
    sizeBytes: 0,
    ramRequiredMB: 0,
    isRecommended: true,
    engine: 'Cloud Edge',
    capabilities: [
      'Natural conversational intelligence',
      'Advanced financial planning & reasoning',
      'Uses OpenRouter Free Tier (google/gemma-4-26b-a4b-it:free)',
      'Requires OpenRouter API key in Settings'
    ]
  },
  {
    id: 'nvidia-nim-cloud',
    name: 'LLaMA 3.3 70B & DeepSeek R1 (NVIDIA)',
    category: 'chat',
    tagline: 'Meta LLaMA 3.3 70B & DeepSeek R1 via NVIDIA NIM',
    description: 'Ultra-high reasoning cloud LLM model powered by NVIDIA Build API (build.nvidia.com). Features Meta LLaMA 3.3 70B and DeepSeek R1 models for advanced financial intelligence.',
    version: '3.3.0',
    sizeFormatted: '0 MB (Cloud)',
    sizeBytes: 0,
    ramRequiredMB: 0,
    isRecommended: true,
    engine: 'Cloud Edge',
    capabilities: [
      '70 Billion parameter flagship AI model',
      'Deep reasoning & financial scenario simulation (DeepSeek R1)',
      'Uses NVIDIA Build free tier (integrate.api.nvidia.com)',
      'Requires NVIDIA API key (nvapi-...) in Settings'
    ]
  },
  {
    id: 'qwen-25-15b',
    name: 'Qwen 2.5 1.5B',
    category: 'chat',
    tagline: 'Deep financial reasoning & debt strategy',
    description: 'Advanced local language model for deep financial coaching, complex budgeting strategy, and scenario simulation.',
    version: '2.5.0',
    sizeFormatted: '980 MB',
    sizeBytes: 980 * 1024 * 1024,
    ramRequiredMB: 2048,
    isRecommended: false,
    engine: 'WebGPU',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/resolve/main/config.json',
    capabilities: [
      'Deep multi-step debt payoff planning',
      'Complex custom financial forecasting',
      'High-precision financial advice'
    ]
  }
];
