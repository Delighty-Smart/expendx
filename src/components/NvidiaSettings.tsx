import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Key, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNvidiaApiKey, setNvidiaApiKey } from '@/services/ai/nvidia';

export const NvidiaSettings: React.FC = () => {
  const [apiKey, setApiKeyValue] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const existingKey = getNvidiaApiKey();
    if (existingKey) {
      setApiKeyValue(existingKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    setNvidiaApiKey(apiKey);
    setIsSaved(!!apiKey.trim());
    toast({
      title: apiKey.trim() ? 'NVIDIA NIM API Key Saved' : 'NVIDIA API Key Cleared',
      description: apiKey.trim()
        ? 'Configured for Meta LLaMA 3.3 70B & DeepSeek R1 via build.nvidia.com'
        : 'API key removed.',
    });
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-2 text-primary font-bold text-sm">
        <Cpu className="w-4 h-4 text-emerald-500" />
        <span>NVIDIA NIM Cloud Model Configuration</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Lucent connects to <strong>Meta LLaMA 3.3 70B Instruct</strong> and <strong>DeepSeek R1</strong> via free NVIDIA Build API endpoints (build.nvidia.com).
      </p>

      <div className="space-y-2">
        <Label htmlFor="nvidia-key" className="text-xs font-semibold">
          NVIDIA API Key (nvapi-...)
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="nvidia-key"
              type="password"
              placeholder="nvapi-..."
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
        <span>Your NVIDIA API key is stored securely in your local browser storage and used directly for requests to integrate.api.nvidia.com.</span>
      </div>
    </div>
  );
};
