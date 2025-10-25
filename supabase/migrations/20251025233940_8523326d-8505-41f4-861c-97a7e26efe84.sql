-- Create sessions table to track active Roblox Studio connections
CREATE TABLE public.studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create game structure table to store the Roblox game tree
CREATE TABLE public.game_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.studio_sessions(session_id) ON DELETE CASCADE,
  structure JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.studio_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pending actions table for plugin to execute
CREATE TABLE public.pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.studio_sessions(session_id) ON DELETE CASCADE,
  action JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.studio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this use case)
CREATE POLICY "Allow all access to studio_sessions" ON public.studio_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to game_structure" ON public.game_structure FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pending_actions" ON public.pending_actions FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_game_structure_session ON public.game_structure(session_id);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_pending_actions_session_status ON public.pending_actions(session_id, status);
CREATE INDEX idx_studio_sessions_heartbeat ON public.studio_sessions(last_heartbeat);