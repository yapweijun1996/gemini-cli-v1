

const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

// For local development, you might use dotenv to load environment variables from a .env file
// require('dotenv').config();

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
  // Read API key from environment variables for security
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not set.' });
  }

  // Arguments for the gemini CLI command
  // Removed -d (debug) flag for cleaner output
  const args = ['-p', prompt, '-y', '--telemetry=false']; 

  // Spawn the gemini process, passing environment variables explicitly
  const child = spawn(geminiPath, args, {
    env: { ...process.env, GEMINI_API_KEY: apiKey },
    // Removed shell: true as it's generally not needed with explicit path and env
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
    
    // Filter out [DEBUG] lines for cleaner response
    const lines = output.split('\n');
    const filteredLines = lines.filter(line => !line.startsWith('[DEBUG]'));
    const cleanedOutput = filteredLines.join('\n').trim();

    // Send the cleaned successful response
    res.json({ response: cleanedOutput });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
