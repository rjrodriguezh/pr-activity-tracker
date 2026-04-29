require("dotenv").config();

const {
  DocumentAnalysisClient,
  AzureKeyCredential,
} = require("@azure/ai-form-recognizer");

const client = new DocumentAnalysisClient(
  process.env.AZURE_DOC_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_DOC_KEY)
);

async function analizarDocumento(rutaArchivo) {
  const fs = require("fs");

  const stream = fs.createReadStream(rutaArchivo);

  const poller = await client.beginAnalyzeDocument(
    "prebuilt-document",
    stream
  );

  const result = await poller.pollUntilDone();

  return result;
}

module.exports = { analizarDocumento };