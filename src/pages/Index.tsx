import { useState, useEffect } from "react";
import { FileExplorer } from "@/components/FileExplorer";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [gameStructure, setGameStructure] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('roblox-session-id');
    if (stored) {
      setSessionId(stored);
      loadGameStructure(stored);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      subscribeToStructure();
    }
  }, [sessionId]);

  const loadGameStructure = async (sid: string) => {
    const { data, error } = await supabase
      .from('game_structure')
      .select('structure')
      .eq('session_id', sid)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setGameStructure(data.structure);
    }
  };

  const subscribeToStructure = () => {
    const channel = supabase
      .channel('game-structure')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_structure',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new && 'structure' in payload.new) {
            setGameStructure(payload.new.structure);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const generateSessionId = () => {
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newId);
    localStorage.setItem('roblox-session-id', newId);
    toast({
      title: "Session Created",
      description: "Copy this ID to your Roblox plugin"
    });
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Session ID copied to clipboard"
    });
  };

  const refreshStructure = () => {
    if (sessionId) {
      loadGameStructure(sessionId);
      toast({
        title: "Refreshed",
        description: "Game structure reloaded"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roblox AI Studio</h1>
            <p className="text-sm text-muted-foreground">Chat with AI to create scripts</p>
          </div>
          
          <div className="flex items-center gap-2">
            {sessionId ? (
              <>
                <Input
                  value={sessionId}
                  readOnly
                  className="w-64 font-mono text-xs"
                />
                <Button
                  onClick={copySessionId}
                  variant="outline"
                  size="icon"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={refreshStructure}
                  variant="outline"
                  size="icon"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button onClick={generateSessionId}>
                Generate Session ID
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {sessionId ? (
          <>
            {/* File Explorer Sidebar */}
            <div className="w-80 border-r border-border">
              <FileExplorer structure={gameStructure} />
            </div>

            {/* Chat Interface */}
            <div className="flex-1">
              <ChatInterface sessionId={sessionId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <h2 className="text-2xl font-semibold text-foreground">Get Started</h2>
              <p className="text-muted-foreground">
                Generate a Session ID to begin. You'll need to add this ID to your Roblox plugin
                to sync your game structure and execute AI-generated actions.
              </p>
              <Button onClick={generateSessionId} size="lg">
                Generate Session ID
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
