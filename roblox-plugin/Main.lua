-- Main.lua (Updated Plugin for Web-Based AI Studio)
-- Place this in a Plugin in Roblox Studio

local plugin = plugin
local HttpService = game:GetService("HttpService")

-- Configuration
local BASE_URL = "https://onsqvzmdyihwhydkcmkh.supabase.co/functions/v1"
local SYNC_INTERVAL = 5 -- seconds
local POLL_INTERVAL = 3 -- seconds

-- State
local sessionId = nil
local syncTimer = 0
local pollTimer = 0
local isRunning = false

-- UI Setup
local toolbar = plugin:CreateToolbar("AI Studio")
local connectButton = toolbar:CreateButton(
  "Connect",
  "Connect to AI Studio",
  "rbxassetid://0"
)

local DockWidgetPluginGuiInfo = DockWidgetPluginGuiInfo.new(
  Enum.InitialDockState.Float,
  true,
  false,
  320,
  180,
  300,
  150
)

local widget = plugin:CreateDockWidgetPluginGui("AIStudioWidget", DockWidgetPluginGuiInfo)
widget.Title = "AI Studio Connection"

-- Create UI
local main = Instance.new("Frame")
main.Size = UDim2.new(1, 0, 1, 0)
main.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
main.Parent = widget

local titleLabel = Instance.new("TextLabel")
titleLabel.Text = "AI Studio Session ID"
titleLabel.Size = UDim2.new(1, -20, 0, 24)
titleLabel.Position = UDim2.new(0, 10, 0, 10)
titleLabel.BackgroundTransparency = 1
titleLabel.TextColor3 = Color3.fromRGB(220, 220, 220)
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Font = Enum.Font.SourceSansBold
titleLabel.TextSize = 16
titleLabel.Parent = main

local sessionInput = Instance.new("TextBox")
sessionInput.PlaceholderText = "Paste session ID from web interface..."
sessionInput.Size = UDim2.new(1, -20, 0, 40)
sessionInput.Position = UDim2.new(0, 10, 0, 40)
sessionInput.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
sessionInput.TextColor3 = Color3.fromRGB(255, 255, 255)
sessionInput.Text = ""
sessionInput.TextWrapped = true
sessionInput.ClearTextOnFocus = false
sessionInput.Font = Enum.Font.Code
sessionInput.TextSize = 12
sessionInput.Parent = main

local connectBtn = Instance.new("TextButton")
connectBtn.Text = "Connect"
connectBtn.Size = UDim2.new(0, 120, 0, 36)
connectBtn.Position = UDim2.new(0, 10, 0, 90)
connectBtn.BackgroundColor3 = Color3.fromRGB(80, 120, 255)
connectBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
connectBtn.Font = Enum.Font.SourceSansBold
connectBtn.TextSize = 16
connectBtn.Parent = main

local statusLabel = Instance.new("TextLabel")
statusLabel.Text = "Not connected"
statusLabel.Size = UDim2.new(1, -20, 0, 20)
statusLabel.Position = UDim2.new(0, 10, 0, 135)
statusLabel.BackgroundTransparency = 1
statusLabel.TextColor3 = Color3.fromRGB(180, 180, 180)
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Font = Enum.Font.SourceSans
statusLabel.TextSize = 14
statusLabel.Parent = main

-- Helper Functions
local function setStatus(text, color)
  statusLabel.Text = text
  if color then
    statusLabel.TextColor3 = color
  end
end

local function httpPost(endpoint, body)
  local success, result = pcall(function()
    return HttpService:PostAsync(
      BASE_URL .. endpoint,
      HttpService:JSONEncode(body),
      Enum.HttpContentType.ApplicationJson
    )
  end)
  
  if not success then
    warn("HTTP Error:", result)
    return nil, result
  end
  
  local ok, parsed = pcall(function()
    return HttpService:JSONDecode(result)
  end)
  
  if not ok then
    return nil, "Failed to parse response"
  end
  
  return parsed, nil
end

-- Collect game structure
local function collectGameStructure()
  local structure = {}
  
  local function addToStructure(parent, path)
    for _, child in ipairs(parent:GetChildren()) do
      if not path[child.Name] then
        path[child.Name] = {}
      end
      
      if child:IsA("Script") or child:IsA("LocalScript") or child:IsA("ModuleScript") then
        path[child.Name].type = child.ClassName
      end
      
      if #child:GetChildren() > 0 then
        addToStructure(child, path[child.Name])
      end
    end
  end
  
  -- Collect from main services
  local services = {
    game:GetService("Workspace"),
    game:GetService("ReplicatedStorage"),
    game:GetService("ServerScriptService"),
    game:GetService("ServerStorage"),
    game:GetService("StarterPlayer"),
    game:GetService("StarterGui"),
    game:GetService("StarterPack"),
  }
  
  for _, service in ipairs(services) do
    structure[service.Name] = {}
    addToStructure(service, structure[service.Name])
  end
  
  return structure
end

-- Sync game structure to backend
local function syncStructure()
  if not sessionId then return end
  
  local structure = collectGameStructure()
  local response, err = httpPost("/sync-structure", {
    sessionId = sessionId,
    structure = structure
  })
  
  if err then
    setStatus("Sync failed: " .. tostring(err), Color3.fromRGB(255, 100, 100))
  end
end

-- Poll for pending actions
local function pollActions()
  if not sessionId then return end
  
  local response, err = httpPost("/get-actions", {
    sessionId = sessionId
  })
  
  if err then
    setStatus("Poll failed: " .. tostring(err), Color3.fromRGB(255, 100, 100))
    return
  end
  
  if response and response.actions then
    for _, actionData in ipairs(response.actions) do
      executeAction(actionData)
    end
  end
end

-- Execute an action
function executeAction(actionData)
  local action = actionData.action
  local actionId = actionData.id
  
  if not action then
    warn("Invalid action data")
    return
  end
  
  local success, errorMsg = pcall(function()
    if action.action == "create" then
      createScript(action)
    elseif action.action == "edit" then
      editScript(action)
    elseif action.action == "delete" then
      deleteScript(action)
    end
  end)
  
  -- Report back to backend
  httpPost("/complete-action", {
    actionId = actionId,
    status = success and "completed" or "failed",
    errorMessage = success and nil or tostring(errorMsg)
  })
  
  if success then
    setStatus("✓ Executed: " .. action.action .. " " .. action.name, Color3.fromRGB(100, 255, 100))
  else
    setStatus("✗ Failed: " .. tostring(errorMsg), Color3.fromRGB(255, 100, 100))
  end
end

function createScript(action)
  local service = game:FindService(action.targetService)
  if not service then
    error("Service not found: " .. action.targetService)
  end
  
  if service:FindFirstChild(action.name) then
    error("Script already exists: " .. action.name)
  end
  
  local script
  if action.scriptType == "ModuleScript" then
    script = Instance.new("ModuleScript")
  elseif action.scriptType == "LocalScript" then
    script = Instance.new("LocalScript")
  else
    script = Instance.new("Script")
  end
  
  script.Name = action.name
  script.Source = action.source or ""
  script.Parent = service
end

function editScript(action)
  local service = game:FindService(action.targetService)
  if not service then
    error("Service not found: " .. action.targetService)
  end
  
  local script = service:FindFirstChild(action.name)
  if not script then
    error("Script not found: " .. action.name)
  end
  
  if script:IsA("Script") or script:IsA("LocalScript") or script:IsA("ModuleScript") then
    script.Source = action.source or script.Source
  else
    error("Not a script: " .. action.name)
  end
end

function deleteScript(action)
  local service = game:FindService(action.targetService)
  if not service then
    error("Service not found: " .. action.targetService)
  end
  
  local script = service:FindFirstChild(action.name)
  if not script then
    error("Script not found: " .. action.name)
  end
  
  script:Destroy()
end

-- Main loop
local function mainLoop()
  local lastTime = tick()
  
  game:GetService("RunService").Heartbeat:Connect(function()
    if not isRunning then return end
    
    local currentTime = tick()
    local deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    syncTimer = syncTimer + deltaTime
    pollTimer = pollTimer + deltaTime
    
    if syncTimer >= SYNC_INTERVAL then
      syncTimer = 0
      syncStructure()
    end
    
    if pollTimer >= POLL_INTERVAL then
      pollTimer = 0
      pollActions()
    end
  end)
end

-- Connect button handler
connectBtn.MouseButton1Click:Connect(function()
  local input = sessionInput.Text:match("^%s*(.-)%s*$") -- trim
  
  if input == "" then
    setStatus("Please enter a session ID", Color3.fromRGB(255, 100, 100))
    return
  end
  
  if isRunning then
    -- Disconnect
    isRunning = false
    sessionId = nil
    connectBtn.Text = "Connect"
    connectBtn.BackgroundColor3 = Color3.fromRGB(80, 120, 255)
    setStatus("Disconnected", Color3.fromRGB(180, 180, 180))
  else
    -- Connect
    sessionId = input
    isRunning = true
    connectBtn.Text = "Disconnect"
    connectBtn.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
    setStatus("Connected - syncing...", Color3.fromRGB(100, 255, 100))
    
    -- Initial sync
    syncStructure()
  end
end)

-- Toolbar button
connectButton.Click:Connect(function()
  widget.Enabled = not widget.Enabled
end)

-- Start main loop
mainLoop()

print("AI Studio Plugin loaded - Open the widget to connect")