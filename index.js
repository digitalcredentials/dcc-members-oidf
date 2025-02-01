const express = require('express');
const https = require('https');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

const TRUST_ANCHOR_NAME = "issuer-registry";
const ISSUERS_SUBFOLDER_NAME = "issuers";
const THIS_URL = "https://sandbox123123.example.com"; // For determining internal path for fetch statement
const JWKS_KTY = "EC"
const JWKS_CURVE = "P-256"

// SSL/TLS certificates
const options = {
  key: fs.readFileSync('server.key'), // Replace with the path to your private key
  cert: fs.readFileSync('server.crt'), // Replace with the path to your certificate
};

// Startup checks:
// TODO: Get most recent JWKs from external sources
// TODO: Ensure that all private keys and public keys actually match

// TODO: add functionality to convert PNG to base64




// Trust anchor well-known endpoint
app.get(`/${TRUST_ANCHOR_NAME}/.well-known/openid-federation`, (req, res) => {
  res.send();
});


// Health check endpoint for pre-testing purposes
app.get(`/health`, (req, res) => {
  res.send("Success"); // Respond with 'a'
});

// Start the server with HTTPS
https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS Server listening on port ${port}.`);
});