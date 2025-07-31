export interface Subscription {
  id: string;
  user_id: string;
  service_provider: string;
  card_type: string;
  last_four_digits: string;
  subscription_type: 'monthly' | 'annual';
  amount: number;
  status: 'inactive' | 'active' | 'canceled' | 'expired';
  next_billing_date?: string;
  last_transaction_date?: string;
  created_at?: string;
  updated_at?: string;
}

export const SERVICE_PROVIDERS = [
  'Spotify',
  'Netflix',
  'YouTube Premium',
  'Amazon Prime',
  'Disney+',
  'Apple Music',
  'Hulu',
  'HBO Max',
  'Adobe Creative Cloud',
  'Microsoft 365',
  'Google Workspace',
  'Dropbox',
  'GitHub',
  'LinkedIn Premium',
  'Zoom Pro',
  'Slack Premium',
  'Canva Pro',
  'Figma',
  'Notion',
  'Other'
];

export const CARD_TYPES = [
  'Mastercard',
  'Visa',
  'Verve',
  'Virtual Card',
  'Prepaid Card',
  'American Express',
  'Other'
];

export const SUBSCRIPTION_TYPES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' }
];

export const SUBSCRIPTION_STATUSES = [
  { value: 'inactive', label: 'Inactive', color: 'text-muted-foreground' },
  { value: 'active', label: 'Active', color: 'text-green-600' },
  { value: 'canceled', label: 'Canceled', color: 'text-red-600' },
  { value: 'expired', label: 'Expired', color: 'text-orange-600' }
];