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

  // Construct the command with the full path
  const command = `/opt/homebrew/bin/gemini -p "${prompt}" -y`;

  console.log(`Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send({ error: 'Failed to execute Gemini CLI', details: stderr });
    }
    console.log(`Gemini stdout: ${stdout}`);
    console.error(`Gemini stderr: ${stderr}`);
    res.send({ response: stdout });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});