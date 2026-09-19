import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TransactionType } from '@/types/transactions';

interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  frequency: string;
}

interface RecurringTemplateSelectorProps {
  onSelect: (template: RecurringTemplate | null) => void;
  transactionType: TransactionType;
  disabled?: boolean;
}

export function RecurringTemplateSelector({ 
  onSelect, 
  transactionType,
  disabled 
}: RecurringTemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['recurring-templates', transactionType],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(
        collection(db, 'recurring_templates'),
        where('user_id', '==', user.uid),
        where('type', '==', transactionType),
        orderBy('name')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecurringTemplate[];
    },
  });

  if (isLoading || !templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Use a Template (Optional)</Label>
      <Select
        onValueChange={(value) => {
          if (value === 'none') {
            onSelect(null);
          } else {
            const template = templates.find(t => t.id === value);
            if (template) onSelect(template);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-10 rounded-lg border-border/50">
          <SelectValue placeholder="Select a recurring template..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {templates.map(template => (
            <SelectItem key={template.id} value={template.id}>
              {template.name} - ${template.amount} ({template.frequency})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
