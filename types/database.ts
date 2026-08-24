// Handgeschriebene Typen passend zum Schema in /supabase/migrations.
// Sobald ein echtes Supabase-Projekt existiert, koennen diese durch
// `supabase gen types typescript` ersetzt/aktualisiert werden:
//   npx supabase gen types typescript --local > types/database.ts

export type MemberRole = "member" | "admin" | "vorstand" | "coach";
export type RsvpStatus = "yes" | "no";
export type Team = "herren" | "u16";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      members: Table<
        {
          id: string;
          name: string;
          pin_hash: string;
          role: MemberRole;
          team: Team | null;
          avatar_url: string | null;
          must_change_pin: boolean;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          pin_hash: string;
          role?: MemberRole;
          team?: Team | null;
          avatar_url?: string | null;
          must_change_pin?: boolean;
          created_at?: string;
        },
        Partial<{
          id: string;
          name: string;
          pin_hash: string;
          role: MemberRole;
          team: Team | null;
          avatar_url: string | null;
          must_change_pin: boolean;
          created_at: string;
        }>
      >;
      matches: Table<
        {
          id: string;
          title: string;
          location_name: string;
          location_address: string;
          starts_at: string;
          result: string | null;
          team: Team;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          title: string;
          location_name: string;
          location_address: string;
          starts_at: string;
          result?: string | null;
          team: Team;
          created_by?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          title: string;
          location_name: string;
          location_address: string;
          starts_at: string;
          result: string | null;
          team: Team;
          created_by: string | null;
          created_at: string;
        }>
      >;
      trainings: Table<
        {
          id: string;
          title: string;
          starts_at: string;
          location: string | null;
          team: Team;
          series_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          title: string;
          starts_at: string;
          location?: string | null;
          team: Team;
          series_id?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          title: string;
          starts_at: string;
          location: string | null;
          team: Team;
          series_id: string | null;
          created_at: string;
        }>
      >;
      training_rsvps: Table<
        {
          id: string;
          training_id: string;
          member_id: string;
          status: RsvpStatus;
          attended: boolean | null;
        },
        {
          id?: string;
          training_id: string;
          member_id: string;
          status: RsvpStatus;
          attended?: boolean | null;
        },
        Partial<{
          id: string;
          training_id: string;
          member_id: string;
          status: RsvpStatus;
          attended: boolean | null;
        }>
      >;
      match_attendance: Table<
        {
          id: string;
          match_id: string;
          member_id: string;
          attended: boolean;
          created_at: string;
        },
        {
          id?: string;
          match_id: string;
          member_id: string;
          attended?: boolean;
          created_at?: string;
        },
        Partial<{
          id: string;
          match_id: string;
          member_id: string;
          attended: boolean;
          created_at: string;
        }>
      >;
      events: Table<
        {
          id: string;
          title: string;
          description: string | null;
          starts_at: string;
          location: string | null;
          created_at: string;
        },
        {
          id?: string;
          title: string;
          description?: string | null;
          starts_at: string;
          location?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          title: string;
          description: string | null;
          starts_at: string;
          location: string | null;
          created_at: string;
        }>
      >;
      carpools: Table<
        {
          id: string;
          match_id: string | null;
          driver_id: string;
          total_seats: number;
          departure_point: string;
          departure_time: string;
          created_at: string;
        },
        {
          id?: string;
          match_id?: string | null;
          driver_id: string;
          total_seats: number;
          departure_point: string;
          departure_time: string;
          created_at?: string;
        },
        Partial<{
          id: string;
          match_id: string | null;
          driver_id: string;
          total_seats: number;
          departure_point: string;
          departure_time: string;
          created_at: string;
        }>
      >;
      carpool_bookings: Table<
        {
          id: string;
          carpool_id: string;
          member_id: string;
          created_at: string;
        },
        {
          id?: string;
          carpool_id: string;
          member_id: string;
          created_at?: string;
        },
        Partial<{
          id: string;
          carpool_id: string;
          member_id: string;
          created_at: string;
        }>
      >;
      gallery_photos: Table<
        {
          id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          storage_path: string;
          caption?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        }>
      >;
      board_members: Table<
        {
          id: string;
          member_id: string | null;
          display_name: string | null;
          position: string;
          responsibilities: string | null;
          photo_url: string | null;
          sort_order: number;
        },
        {
          id?: string;
          member_id?: string | null;
          display_name?: string | null;
          position: string;
          responsibilities?: string | null;
          photo_url?: string | null;
          sort_order?: number;
        },
        Partial<{
          id: string;
          member_id: string | null;
          display_name: string | null;
          position: string;
          responsibilities: string | null;
          photo_url: string | null;
          sort_order: number;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      book_carpool_seat: {
        Args: { p_carpool_id: string };
        Returns: {
          id: string;
          carpool_id: string;
          member_id: string;
          created_at: string;
        };
      };
    };
  };
}
