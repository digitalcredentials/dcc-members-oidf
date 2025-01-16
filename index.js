const express = require('express');
const https = require('https');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

const TRUST_ANCHOR_NAME = "issuer-registry";

// SSL/TLS certificates
const options = {
  key: fs.readFileSync('server.key'), // Replace with the path to your private key
  cert: fs.readFileSync('server.crt'), // Replace with the path to your certificate
};


// // The array of numbers
// const numbers = [1, 2, 13];

// // Dynamically create endpoints for each number
// numbers.forEach((num) => {
//   app.get(`/test${num}`, (req, res) => {
//     res.send('a'); // Respond with 'a'
//   });
// });


// Trust anchor well-known endpoint
app.get(`/${TRUST_ANCHOR_NAME}/.well-known/openid-federation`, (req, res) => {
  res.send(); // Respond with 'a'
});





// Health check endpoint for pre-testing purposes
app.get(`/health`, (req, res) => {
  res.send(); // Respond with 'a'
});

// Start the server with HTTPS
https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS Server listening on port ${port}.`);
});