const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

const projectId = "";
const location = '';
const processorId = '';

async function extractInvoiceId(projectId, location, filePaths) {
  const client = new DocumentProcessorServiceClient({
    projectId: projectId,
    location: location,
    keyFile: './service-account.json',
  });

  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const invoiceIdsPromises = filePaths.map(async (file) => {
    const request = {
      name,
      rawDocument: {
        content: file.buffer.toString('base64'),
        mimeType: 'image/jpeg',
      },
    };

    const [response] = await client.processDocument(request);
    const document = response.document;

    let invoiceId = '';
    document.entities.forEach((entity) => {
      if (entity.type === 'invoice_id') {
        invoiceId = entity.mentionText;
      }
    });

    return invoiceId;
  });

  const invoiceIds = await Promise.all(invoiceIdsPromises);
  return invoiceIds;
}

app.post('/upload', upload.array('images'), async (req, res) => {
  const files = req.files;

  try {
    const invoiceIds = await extractInvoiceId(projectId, location, files);
    res.json({ invoiceIds: invoiceIds });
  } catch (error) {
    console.error('Error processing documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function setupAuth() {

}

setupAuth()
  .then(() => app.listen(3000, () => console.log('Server listening on port 3000')))
  .catch(console.error);

