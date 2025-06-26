
document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('prompt-input');
  const sendBtn = document.getElementById('send-btn');
  const chatHistory = document.getElementById('chat-history');
  const preview = document.getElementById('preview');

  sendBtn.addEventListener('click', sendMessage);
  promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  function sendMessage() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    appendMessage(prompt, 'user-message');
    promptInput.value = '';

    fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })
    .then(response => response.json())
    .then(data => {
      appendMessage(data.response, 'ai-message');
      updatePreview(data.response);
    })
    .catch(error => {
      console.error('Error:', error);
      appendMessage('Error: Could not get a response from the AI.', 'ai-message');
    });
  }

  function appendMessage(text, className) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${className}`;
    messageElement.textContent = text;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function updatePreview(code) {
    const previewDoc = preview.contentWindow.document;
    previewDoc.open();
    previewDoc.write(code);
    previewDoc.close();
  }
});
