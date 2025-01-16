const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

// The array of numbers
const numbers = [1, 2, 13];

// Dynamically create endpoints for each number
numbers.forEach((num) => {
  app.get(`/test${num}`, (req, res) => {
    res.send('a'); // Respond with 'a'
  });
});


app.get(`/health`, (req, res) => {
  res.send(); // Respond with 'a'
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});