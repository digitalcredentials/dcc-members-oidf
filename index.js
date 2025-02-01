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




// Initialize SQLite database connection
const db = new sqlite3.Database('issuerreg.db', (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable foreign key constraints
    db.run("PRAGMA foreign_keys = ON;", (err) => {
      if (err) {
        console.error('Failed to enable foreign key constraints:', err.message);
      } else {
        console.log('Foreign key constraints enabled.');
      }
    });
  }
});








// Function to sanitize ISSUER string
const sanitizeIssuer = (issuer) => {
  const sanitized = issuer.replace(/[^a-zA-Z0-9_]/g, ''); // Keep alphanumeric and underscores
  if (sanitized !== issuer) {
    console.warn(`Non-alphanumeric characters found in issuer: ${issuer}`);
  }
  return sanitized;
};

// Query the database for issuers
const fetchInternalIssuers = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT sub_name FROM issuers WHERE sub_name LIKE ?`;
    db.all(query, [`${THIS_URL}/${ISSUERS_SUBFOLDER_NAME}/%`], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Serve well-known openid-federation file for each issuer
(async () => {
    try {
      const issuers = await fetchInternalIssuers();
      issuers.forEach(({ sub_name }) => {
        const issuer = sub_name.replace(`${THIS_URL}/${ISSUERS_SUBFOLDER_NAME}/`, '');
        const sanitizedIssuer = sanitizeIssuer(issuer);

        // Serve the .well-known/openid-federation for the issuer
        app.get(`/issuers/${sanitizedIssuer}/.well-known/openid-federation`, (req, res) => {
          res.status(200).json({});
        });

        console.log(`Serving .well-known/openid-federation for ${sanitizedIssuer}`);
      });
    } catch (error) {
      console.error('Error fetching issuers:', error);
    }
  }
)();





// Subordinate listing endpoint - queries issuers with approval_status <> 0
app.get(`/${TRUST_ANCHOR_NAME}/subordinate_listing`, (req, res) => {
  const query = `SELECT sub_name FROM issuers WHERE approval_status <> 0`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error executing query:', err.message);
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Extract sub_name values into an array
    const subNames = rows.map(row => row.sub_name);

    // Respond with the sub_names as a JSON array
    res.json(subNames);
  });
});



// Fetch endpoint - checks if the sub_name exists in the database
app.get(`/${TRUST_ANCHOR_NAME}/fetch`, (req, res) => {
  const subUrl = req.query.sub;

  // TODO: determine proper implementation
  // if (!subUrl) {
  //   return res.status(400).json({ error: 'Missing sub query parameter' });
  // }

  const query = `SELECT sub_name FROM issuers WHERE sub_name = ?`;

  db.get(query, [subUrl], (err, row) => {
    if (err) {
      console.error('Error executing query:', err.message);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!row) {
      // If no matching sub_name is found, return 404 with an empty object
      return res.status(404).json({});
    }

    // If the sub_name exists, return 200 with an empty object
    res.status(200).json({});
  });
});





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