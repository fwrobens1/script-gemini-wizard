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
    const { sessionId, message } = await req.json();
    
    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'sessionId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Store user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    });

    // Get game structure for context
    const { data: structureData } = await supabase
      .from('game_structure')
      .select('structure')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const context = structureData?.structure || {};

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a Roblox Lua code assistant. You must respond ONLY with valid JSON matching this exact schema:

{
  "action": "create" | "edit" | "delete",
  "targetService": string (e.g., "ServerScriptService", "ReplicatedStorage"),
  "scriptType": "Script" | "LocalScript" | "ModuleScript",
  "name": string (script name),
  "source": string (full Lua source code - required for create/edit),
  "reason": string (brief explanation)
}

CRITICAL RULES:
- Return ONLY the JSON object, no other text
- For "create" or "edit" actions, always include complete, working Lua source code in the "source" field
- For "delete" actions, omit the "source" field
- Be concise but complete in the "reason" field
- Ensure Lua code follows Roblox best practices
- Include proper error handling in generated code

Current game structure: ${JSON.stringify(context)}

User request: ${message}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Empty AI response');
    }

    // Parse the JSON response
    let actionObject;
    try {
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       aiResponse.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      actionObject = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate action object
    const validActions = ['create', 'edit', 'delete'];
    const validScriptTypes = ['Script', 'LocalScript', 'ModuleScript'];

    if (!validActions.includes(actionObject.action)) {
      throw new Error('Invalid action type');
    }

    if (!actionObject.name || !actionObject.targetService) {
      throw new Error('Missing required fields');
    }

    if (actionObject.scriptType && !validScriptTypes.includes(actionObject.scriptType)) {
      throw new Error('Invalid scriptType');
    }

    if ((actionObject.action === 'create' || actionObject.action === 'edit') && !actionObject.source) {
      throw new Error('source field is required for create/edit actions');
    }

    // Store assistant message
    const assistantMessage = `I'll ${actionObject.action} "${actionObject.name}" in ${actionObject.targetService}. ${actionObject.reason || ''}`;
    
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantMessage
    });

    // Store pending action for plugin to execute
    await supabase.from('pending_actions').insert({
      session_id: sessionId,
      action: actionObject
    });

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        action: actionObject 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});