import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vebxadkigxwoyewlouvy.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase API key. Please set SUPABASE_API_KEY or SUPABASE_SERVICE_ROLE_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      trip: {
        Row: {
          id: string;
          destinations: string[];
          starting_point: string | null;
          end_point: string | null;
          start_date: string;
          end_date: string;
          flexible_dates: boolean;
          preferences: Record<string, any>;
          transportation: string[] | null;
          things_to_do: Record<string, any> | null;
          food_dietary: string[] | null;
          citizenship: string;
          budget: number;
          currency: string | null;
          purpose_of_trip: string | null;
          itinerary: Record<string, any> | null;
          tasks: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destinations: string[];
          starting_point?: string | null;
          end_point?: string | null;
          start_date: string;
          end_date: string;
          flexible_dates?: boolean;
          preferences: Record<string, any>;
          transportation?: string[] | null;
          things_to_do?: Record<string, any> | null;
          food_dietary?: string[] | null;
          citizenship: string;
          budget: number;
          currency?: string | null;
          purpose_of_trip?: string | null;
          itinerary?: Record<string, any> | null;
          tasks?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          destinations?: string[];
          starting_point?: string | null;
          end_point?: string | null;
          start_date?: string;
          end_date?: string;
          flexible_dates?: boolean;
          preferences?: Record<string, any>;
          transportation?: string[] | null;
          things_to_do?: Record<string, any> | null;
          food_dietary?: string[] | null;
          citizenship?: string;
          budget?: number;
          currency?: string | null;
          purpose_of_trip?: string | null;
          itinerary?: Record<string, any> | null;
          tasks?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
