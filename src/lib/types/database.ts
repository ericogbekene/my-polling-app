// Database types for the polling app
// These types match the Supabase database schema

export interface Database {
  public: {
    Tables: {
      polls: {
        Row: Poll;
        Insert: PollInsert;
        Update: PollUpdate;
      };
      poll_options: {
        Row: PollOption;
        Insert: PollOptionInsert;
        Update: PollOptionUpdate;
      };
      votes: {
        Row: Vote;
        Insert: VoteInsert;
        Update: VoteUpdate;
      };
    };
    Views: {
      poll_results: {
        Row: PollResult;
      };
      user_polls: {
        Row: UserPoll;
      };
    };
    Functions: {
      can_user_vote: {
        Args: {
          p_poll_id: string;
          p_user_id?: string;
          p_voter_email?: string;
        };
        Returns: boolean;
      };
    };
  };
}

// =============================================
// TABLE TYPES
// =============================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
  allow_multiple_votes: boolean;
  require_auth_to_vote: boolean;
  share_token: string;
}

export interface PollInsert {
  id?: string;
  title: string;
  description?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string | null;
  is_active?: boolean;
  allow_multiple_votes?: boolean;
  require_auth_to_vote?: boolean;
  share_token?: string;
}

export interface PollUpdate {
  id?: string;
  title?: string;
  description?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string | null;
  is_active?: boolean;
  allow_multiple_votes?: boolean;
  require_auth_to_vote?: boolean;
  share_token?: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface PollOptionInsert {
  id?: string;
  poll_id: string;
  text: string;
  created_at?: string;
  updated_at?: string;
  sort_order?: number;
}

export interface PollOptionUpdate {
  id?: string;
  poll_id?: string;
  text?: string;
  created_at?: string;
  updated_at?: string;
  sort_order?: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  voter_email: string | null;
  voter_name: string | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface VoteInsert {
  id?: string;
  poll_id: string;
  option_id: string;
  user_id?: string | null;
  voter_email?: string | null;
  voter_name?: string | null;
  created_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface VoteUpdate {
  id?: string;
  poll_id?: string;
  option_id?: string;
  user_id?: string | null;
  voter_email?: string | null;
  voter_name?: string | null;
  created_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

// =============================================
// VIEW TYPES
// =============================================

export interface PollResult {
  poll_id: string;
  poll_title: string;
  poll_description: string | null;
  poll_created_at: string;
  poll_expires_at: string | null;
  poll_is_active: boolean;
  option_id: string;
  option_text: string;
  sort_order: number;
  vote_count: number;
  vote_percentage: number | null;
}

export interface UserPoll extends Poll {
  option_count: number;
  total_votes: number;
  status: 'active' | 'inactive' | 'expired';
}

// =============================================
// UTILITY TYPES
// =============================================

export type PollStatus = 'active' | 'inactive' | 'expired';

export interface PollWithOptions extends Poll {
  options: PollOption[];
}

export interface PollWithResults extends Poll {
  options: (PollOption & {
    vote_count: number;
    vote_percentage: number;
  })[];
  total_votes: number;
}

export interface CreatePollData {
  title: string;
  description?: string;
  options: string[];
  expires_at?: string;
  allow_multiple_votes?: boolean;
  require_auth_to_vote?: boolean;
}

export interface VoteData {
  poll_id: string;
  option_id: string;
  voter_email?: string;
  voter_name?: string;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PollsResponse extends ApiResponse<Poll[]> {}
export interface PollResponse extends ApiResponse<PollWithResults> {}
export interface CreatePollResponse extends ApiResponse<Poll> {}
export interface VoteResponse extends ApiResponse<Vote> {}
