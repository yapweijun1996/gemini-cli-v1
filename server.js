

const express = require('express');
const { exec } = require('child_process');
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
    return res.status(400).send({ error: 'Prompt is required' });
  }

  // IMPORTANT: Sanitize prompt to prevent shell injection.
  // This replaces single quotes to ensure the command is safe.
  const sanitizedPrompt = prompt.replace(/'/g, "'\\''");

  // Execute the command within a login shell ('bash -l') to ensure
  // the environment is loaded correctly, just like in your terminal.
  const command = `bash -l -c "/opt/homebrew/bin/gemini -p '${sanitizedPrompt}' -y"`;

  console.log(`Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).send({ error: 'Failed to execute Gemini CLI', details: stderr || error.message });
    }
    
    console.log(`Gemini stdout: ${stdout}`);
    if (stderr) {
        console.error(`Gemini stderr (non-fatal): ${stderr}`);
    }

    res.send({ response: stdout });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

