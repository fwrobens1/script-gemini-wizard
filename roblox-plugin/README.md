# Roblox AI Studio Plugin

This plugin connects your Roblox Studio to the web-based AI Studio for intelligent script generation.

## Installation

1. In Roblox Studio, go to the View tab and click "Explorer"
2. In the Explorer, find and expand "ServerStorage" (or create a folder in Workspace)
3. Right-click and select "Insert Object" → "Script"
4. Delete the default code and paste the contents of `Main.lua`
5. Right-click the script and convert it to a **Plugin** by:
   - Saving the script as a plugin file
   - Or using a plugin manager like Rojo

## Usage

### Step 1: Get a Session ID

1. Open the AI Studio web interface at your deployment URL
2. Click "Generate Session ID"
3. Copy the generated session ID

### Step 2: Connect the Plugin

1. In Roblox Studio, click the "AI Studio" button in the toolbar
2. Paste your session ID into the text box
3. Click "Connect"
4. The plugin will now sync your game structure and poll for AI actions

### Step 3: Chat with the AI

1. Go back to the web interface
2. Use the chat to ask the AI to create, edit, or delete scripts
3. The plugin will automatically execute the AI's suggestions

## Features

- **Real-time Sync**: The plugin syncs your game structure every 5 seconds
- **Automatic Execution**: AI-generated actions are executed automatically
- **File Explorer**: See your game structure in the web interface
- **Chat History**: All conversations are saved

## Configuration

You can modify these settings in `Main.lua`:

```lua
local SYNC_INTERVAL = 5 -- How often to sync game structure (seconds)
local POLL_INTERVAL = 3 -- How often to check for new actions (seconds)
```

## Troubleshooting

### "HTTP Error" Messages

Make sure HTTP requests are enabled in Roblox Studio:
1. Go to Game Settings → Security
2. Enable "Allow HTTP Requests"

### Plugin Not Connecting

1. Verify your session ID is correct
2. Check that the BASE_URL in Main.lua matches your deployment
3. Ensure you have an active internet connection

### Actions Not Executing

1. Check the status message in the plugin widget
2. Verify the service names (ServerScriptService, ReplicatedStorage, etc.)
3. Make sure scripts with the same name don't already exist

## Support

If you encounter issues:
1. Check the Output window in Roblox Studio for error messages
2. Verify the web interface shows your game structure
3. Try disconnecting and reconnecting the plugin