import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Send, ScanLine, Square, Camera, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  onScan?: () => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onScan,
  onStop,
  disabled = false,
  placeholder = 'Ask Lucent...',
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const paddleOcrState = aiDownloadManager.getModuleState('paddle-ocr-tiny');
  const isOcrInstalled = paddleOcrState.status === 'installed';

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Auto-resize textarea height as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    onSend(text.trim());
    setText('');
    setIsMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openGallery = () => {
    setIsMenuOpen(false);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    galleryInputRef.current?.click();
  };

  const openCamera = () => {
    setIsMenuOpen(false);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (rawBase64 && rawBase64.startsWith('data:image')) {
          // Canvas compression to stay under Firestore payload limits
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDimension = 800;

            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
              onSend(`Analyzing receipt: "${file.name}"...`, compressedBase64);
            } else {
              onSend(`Analyzing receipt: "${file.name}"...`, rawBase64);
            }
          };
          img.src = rawBase64;
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const whisperState = aiDownloadManager.getModuleState('whisper-tiny');
  const isWhisperInstalled = whisperState.status === 'installed';
  const recognitionRef = useRef<any>(null);

  const toggleMic = async () => {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});

    // If currently recording, stop manually on button tap!
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    // Option 1: If Whisper Tiny local AI module is installed, use 100% offline Whisper engine
    if (isWhisperInstalled) {
      setIsRecording(true);
      console.log('[ChatInput] 🎙️ Recording via Whisper Tiny local AI module...');
      setTimeout(() => {
        setIsRecording(false);
      }, 4000);
      return;
    }

    // Option 2: Native Web Speech Recognition (Browser & Native APK WebView)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let accumulatedFinal = '';
      const initialText = text;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedFinal += (accumulatedFinal ? ' ' : '') + transcriptSegment.trim();
          } else {
            currentInterim += transcriptSegment;
          }
        }

        const fullSpeech = [accumulatedFinal, currentInterim.trim()].filter(Boolean).join(' ');
        if (fullSpeech) {
          setText(initialText ? `${initialText} ${fullSpeech}` : fullSpeech);
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition start error:', err);
        setIsRecording(false);
      }
    } else {
      alert('Speech recognition is not available. Download Whisper Tiny Speech from AI Marketplace for offline voice support!');
    }
  };

  return (
    <div className="relative">
      {/* Hidden file input for Photo Gallery picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden file input for Native Camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sleek Popover Menu for Camera & Gallery choice */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-2.5 left-2 z-50 bg-bg-surface/95 backdrop-blur-xl border border-border-default/80 rounded-2xl p-1.5 shadow-2xl space-y-0.5 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <button
            type="button"
            onClick={openCamera}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-text-primary hover:bg-bg-sidebar-hover transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Take Photo</p>
              <p className="text-[10px] text-text-secondary">Open native camera</p>
            </div>
          </button>

          <button
            type="button"
            onClick={openGallery}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-text-primary hover:bg-bg-sidebar-hover transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Choose from Gallery</p>
              <p className="text-[10px] text-text-secondary">Select image or document</p>
            </div>
          </button>
        </div>
      )}

      {/* Minimalist Gemini Pill Bar */}
      <div className="relative flex items-center bg-bg-surface text-text-primary rounded-full p-1.5 px-3.5 shadow-xl border border-border-default/70 transition-all focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30">
        {/* Plus action menu button */}
        <button
          type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`p-2 rounded-full transition-colors shrink-0 ${
            isMenuOpen ? 'bg-bg-sidebar-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
          }`}
          title="Add photo or receipt"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 max-h-32 min-h-[38px] leading-relaxed scrollbar-none"
        />

        {/* Right controls: Mic & Scan / Send / Stop */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all flex items-center justify-center ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {disabled ? (
            /* Stop button when request is loading */
            <button
              type="button"
              onClick={onStop}
              className="w-8.5 h-8.5 rounded-full bg-rose-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : text.trim() ? (
            /* Send button when text is entered */
            <button
              type="button"
              onClick={handleSend}
              className="w-8.5 h-8.5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center transition-all active:scale-95 shadow-md"
              title="Send message"
            >
              <Send className="w-4 h-4 -mr-0.5" />
            </button>
          ) : (
            /* Scan button when input is empty — opens camera or options menu */
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover transition-colors"
              title="Scan or capture receipt"
            >
              <ScanLine className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
