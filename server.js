const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(express.json());

// API endpoint to handle Gemini CLI commands
app.post('/api/gemini', (req, res) => {
  const { prompt } = req.body;
  console.log(`Received prompt: "${prompt}"`);

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const geminiPath = '/opt/homebrew/bin/gemini';
  const apiKey = 'AIzaSyAdtOk3B9vzQIzhxqMyB3WrHmN-OSy8UnY'; // Your Gemini API Key

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not set in server.js' });
  }

  // Arguments for the gemini CLI command
  // Using -d for debug output, -y for yolo mode (auto-accept)
  const args = ['-p', prompt, '-y', '-d', '--telemetry=false']; 

  // Spawn the gemini process, passing environment variables explicitly
  const child = spawn(geminiPath, args, {
    env: { ...process.env, GEMINI_API_KEY: apiKey },
    shell: true // Use shell to ensure environment is loaded correctly
  });

  let output = '';
  let errorOutput = '';

  // Capture stdout data
  child.stdout.on('data', (data) => {
    output += data.toString();
    console.log(`Gemini stdout: ${data.toString()}`);
  });

  // Capture stderr data
  child.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.error(`Gemini stderr: ${data.toString()}`);
  });

  // Handle process errors (e.g., command not found)
  child.on('error', (err) => {
    console.error('Failed to start Gemini CLI process:', err);
    res.status(500).json({ error: 'Failed to start Gemini CLI', details: err.message });
  });

  // Handle process exit
  child.on('close', (code) => {
    console.log(`Gemini CLI process exited with code ${code}`);
    if (code !== 0) {
      // If the process exited with an error code, send an error response
      return res.status(500).json({
        error: `Gemini CLI exited with code ${code}`,
        details: errorOutput || 'No stderr output'
      });
    }
    // Otherwise, send the successful response
    res.json({ response: output });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});