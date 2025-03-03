
export type AlertType = 'connection_request' | 'streak_freeze' | 'budget_alert' | 'connection_accepted';

export interface Alert {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: AlertType;
  related_id?: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  age_bracket?: string;
  country?: string;
  continent?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
}
