export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      entries: {
        Row: {
          created_at: string;
          decision_note: string | null;
          era: Database['public']['Enums']['entry_era'];
          id: string;
          image_alt: string | null;
          image_path: string | null;
          no_preview: boolean;
          published_at: string | null;
          reviewed_by_email: string | null;
          said_on: string | null;
          search: unknown;
          slug: string;
          status: Database['public']['Enums']['entry_status'];
          submitted_by: string | null;
          submitter_ip: unknown;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decision_note?: string | null;
          era?: Database['public']['Enums']['entry_era'];
          id?: string;
          image_alt?: string | null;
          image_path?: string | null;
          no_preview?: boolean;
          published_at?: string | null;
          reviewed_by_email?: string | null;
          said_on?: string | null;
          search?: unknown;
          slug: string;
          status?: Database['public']['Enums']['entry_status'];
          submitted_by?: string | null;
          submitter_ip?: unknown;
        };
        Update: {
          created_at?: string;
          decision_note?: string | null;
          era?: Database['public']['Enums']['entry_era'];
          id?: string;
          image_alt?: string | null;
          image_path?: string | null;
          no_preview?: boolean;
          published_at?: string | null;
          reviewed_by_email?: string | null;
          said_on?: string | null;
          search?: unknown;
          slug?: string;
          status?: Database['public']['Enums']['entry_status'];
          submitted_by?: string | null;
          submitter_ip?: unknown;
        };
        Relationships: [];
      };
      entry_lines: {
        Row: {
          entry_id: string;
          id: string;
          kind: Database['public']['Enums']['line_kind'];
          position: number;
          speaker_id: string | null;
          speaker_label: string | null;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          entry_id: string;
          id?: string;
          kind?: Database['public']['Enums']['line_kind'];
          position: number;
          speaker_id?: string | null;
          speaker_label?: string | null;
          text: string;
        };
        Update: {
          entry_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['line_kind'];
          position?: number;
          speaker_id?: string | null;
          speaker_label?: string | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entry_lines_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entry_lines_speaker_id_fkey';
            columns: ['speaker_id'];
            isOneToOne: false;
            referencedRelation: 'speakers';
            referencedColumns: ['id'];
          },
        ];
      };
      memes: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          image_path: string;
          status: Database['public']['Enums']['entry_status'];
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          status?: Database['public']['Enums']['entry_status'];
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          status?: Database['public']['Enums']['entry_status'];
        };
        Relationships: [];
      };
      moderation_tokens: {
        Row: {
          entry_id: string;
          expires_at: string;
          id: string;
          moderator_email: string;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          entry_id: string;
          expires_at: string;
          id?: string;
          moderator_email: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          entry_id?: string;
          expires_at?: string;
          id?: string;
          moderator_email?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_tokens_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'entries';
            referencedColumns: ['id'];
          },
        ];
      };
      speakers: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      random_published_entry_slug: { Args: Record<PropertyKey, never>; Returns: string };
      refresh_entry_search: { Args: { target: string }; Returns: undefined };
      search_entries: {
        Args: { q: string };
        Returns: {
          era: Database['public']['Enums']['entry_era'];
          id: string;
          image_alt: string;
          image_path: string;
          published_at: string;
          rank: number;
          said_on: string;
          slug: string;
        }[];
      };
    };
    Enums: {
      entry_era: 'modern' | 'college';
      entry_status: 'pending' | 'published' | 'rejected';
      line_kind: 'line' | 'stage' | 'context';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entry_era: ['modern', 'college'],
      entry_status: ['pending', 'published', 'rejected'],
      line_kind: ['line', 'stage', 'context'],
    },
  },
} as const;
