import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Code2, Zap, Shield, Sparkles } from "lucide-react";

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roblox-gemini`;

  const testEndpoint = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to test the endpoint",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      let contextObj = {};
      if (context.trim()) {
        try {
          contextObj = JSON.parse(context);
        } catch {
          toast({
            title: "Invalid JSON",
            description: "Context must be valid JSON or empty",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          context: contextObj,
        }),
      });

      const data = await res.json();
      setResponse(data);

      if (res.ok) {
        toast({
          title: "Success",
          description: "AI response received successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to get response",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
              Roblox AI Backend
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powered by Gemini 2.5 Flash for intelligent Lua script generation
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-[var(--gradient-card)] border-border/50 shadow-[var(--shadow-glow)]">
            <CardHeader>
              <Code2 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Smart Code Generation</CardTitle>
              <CardDescription className="text-muted-foreground">
                AI-powered Lua script creation with Roblox best practices
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[var(--gradient-card)] border-border/50 shadow-[var(--shadow-glow)]">
            <CardHeader>
              <Zap className="w-8 h-8 text-accent mb-2" />
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gemini 2.5 Flash for optimal speed and accuracy
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[var(--gradient-card)] border-border/50 shadow-[var(--shadow-glow)]">
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Type-Safe Responses</CardTitle>
              <CardDescription className="text-muted-foreground">
                Validated JSON schema for reliable plugin integration
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* API Documentation */}
        <Card className="bg-[var(--gradient-card)] border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">API Endpoint</CardTitle>
            <CardDescription>Use this endpoint in your Roblox plugin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
              {endpointUrl}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Request Format</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`POST ${endpointUrl}
Content-Type: application/json

{
  "prompt": "Create a leaderstats script",
  "context": {
    "gameType": "simulator",
    "features": ["coins", "gems"]
  }
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Response Format</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "action": "create",
  "targetService": "ServerScriptService",
  "scriptType": "Script",
  "name": "Leaderstats",
  "source": "-- Full Lua code here",
  "reason": "Creates player leaderstats"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Test Interface */}
        <Card className="bg-[var(--gradient-card)] border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Test the API</CardTitle>
            <CardDescription>Try it out with your own prompts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., Create a script that gives players 100 coins when they join"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context (Optional JSON)</Label>
              <Textarea
                id="context"
                placeholder='{"gameType": "simulator", "currency": "coins"}'
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="bg-background font-mono text-sm"
              />
            </div>

            <Button
              onClick={testEndpoint}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? "Generating..." : "Generate Script"}
            </Button>

            {response && (
              <div className="space-y-2">
                <Label>Response</Label>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lua Client Example */}
        <Card className="bg-[var(--gradient-card)] border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Roblox Client Setup</CardTitle>
            <CardDescription>Update your AIClient.lua with this endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`-- AIClient.lua
local HttpService = game:GetService("HttpService")
local AIClient = {}

AIClient.BackendUrl = "${endpointUrl}"

function AIClient:requestSuggestion(payload)
    local body = {
        prompt = payload.prompt,
        context = payload.context or {}
    }
    
    local json = HttpService:JSONEncode(body)
    local raw = HttpService:PostAsync(
        self.BackendUrl, 
        json, 
        Enum.HttpContentType.ApplicationJson
    )
    
    return HttpService:JSONDecode(raw)
end

return AIClient`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
