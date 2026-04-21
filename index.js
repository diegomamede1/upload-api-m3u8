const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

app.post('/upload', async (req, res) => {
  try {
    const { url, title, api_key, folder_id, description } = req.body || {};

    if (!url || !title || !api_key) {
      return res.status(400).json({ error: 'URL, título e chave da API são obrigatórios.' });
    }

    // Chamada para API do PandaVideo usando HTTPS nativo
    const payload = JSON.stringify({
      url,
      title,
      ...(folder_id && { folder_id }),
      ...(description && { description })
    });

    const options = {
      hostname: 'import.pandavideo.com',
      port: 9443,
      path: '/videos/m3u8',
      method: 'POST',
      headers: {
        'Authorization': api_key,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      rejectUnauthorized: false // Para aceitar certificados auto-assinados
    };

    const data = await new Promise((resolve, reject) => {
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          resolve({ status: response.statusCode, body: data });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(payload);
      req.end();
    });

    let responseData = null;
    if (data.body) {
      try {
        responseData = JSON.parse(data.body);
      } catch {
        responseData = { message: data.body };
      }
    }

    if (data.status >= 200 && data.status < 300) {
      res.json({ success: true, data: responseData });
    } else {
      res.status(data.status).json({ error: responseData || 'Erro na API do PandaVideo' });
    }
  } catch (error) {
    console.error('Erro ao chamar a API:', error.message);
    res.status(500).json({ error: 'Erro: ' + error.message });
  }
});

// Handler global — captura qualquer erro que escape do try-catch
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno: ' + err.message });
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
