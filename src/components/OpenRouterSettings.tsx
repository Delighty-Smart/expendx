import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Key, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterApiKey, setOpenRouterApiKey } from '@/services/ai/openrouter';

export const OpenRouterSettings: React.FC = () => {
  const [apiKey, setApiKeyValue] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const existingKey = getOpenRouterApiKey();
    if (existingKey) {
      setApiKeyValue(existingKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    setOpenRouterApiKey(apiKey);
    setIsSaved(!!apiKey.trim());
    toast({
      title: apiKey.trim() ? 'OpenRouter API Key Saved' : 'OpenRouter API Key Cleared',
      description: apiKey.trim()
        ? 'Configured for google/gemma-4-26b-a4b-it:free'
        : 'API key removed. Cloud AI queries will fall back to local/built-in mode.',
    });
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-2 text-primary font-bold text-sm">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span>OpenRouter Cloud Model Configuration</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Lucent uses <strong>google/gemma-4-26b-a4b-it:free</strong> on OpenRouter (100% free tier model).
      </p>

      <div className="space-y-2">
        <Label htmlFor="openrouter-key" className="text-xs font-semibold">
          OpenRouter API Key
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="openrouter-key"
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => {
                setApiKeyValue(e.target.value);
                setIsSaved(false);
              }}
              className="pl-9 text-sm"
            />
          </div>
          <Button onClick={handleSave} className="rounded-xl font-bold text-xs">
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" /> : null}
            {isSaved ? 'Saved' : 'Save Key'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>Your API key is stored securely in your browser's local storage and used directly for requests to OpenRouter.</span>
      </div>
    </div>
  );
};
