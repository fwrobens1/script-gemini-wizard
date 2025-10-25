import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, structure } = await req.json();
    
    if (!sessionId || !structure) {
      return new Response(
        JSON.stringify({ error: 'sessionId and structure are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure session exists
    const { data: session } = await supabase
      .from('studio_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      await supabase.from('studio_sessions').insert({ session_id: sessionId });
    } else {
      // Update heartbeat
      await supabase
        .from('studio_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('session_id', sessionId);
    }

    // Upsert game structure
    const { data: existing } = await supabase
      .from('game_structure')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      await supabase
        .from('game_structure')
        .update({ 
          structure, 
          updated_at: new Date().toISOString() 
        })
        .eq('session_id', sessionId);
    } else {
      await supabase
        .from('game_structure')
        .insert({ session_id: sessionId, structure });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Sync structure error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});