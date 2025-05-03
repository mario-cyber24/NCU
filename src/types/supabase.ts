export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          avatar_url: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          amount: number
          type: 'deposit' | 'withdrawal' | 'transfer'
          description: string
          method: string | null
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          amount: number
          type: 'deposit' | 'withdrawal' | 'transfer'
          description: string
          method?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          amount?: number
          type?: 'deposit' | 'withdrawal' | 'transfer'
          description?: string
          method?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
  }
}