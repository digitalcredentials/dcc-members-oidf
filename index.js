const express = require('express');
const https = require('https');
const fs = require('fs');
const jose = require('jose');
const { sign } = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

const TRUST_ANCHOR_NAME = "issuer-registry";
const ISSUERS_SUBFOLDER_NAME = "issuers";
const THIS_URL = "https://testorganization.example.com"; // For determining internal path for fetch statement (before issuers subfolder)
const JWKS_KTY = "EC";
const JWKS_CURVE = "P-256";
const JWT_ALG = "ES256";
const TOKEN_DURATION = 60 * 60 * 24 * 1; // in seconds = 1 day

const THIS_ORGANIZATION_NAME = "Test Organization"
const THIS_ORGANIZATION_HOMEPAGE_URI = "https://testorganization.example.com/homepage"
const THIS_ORGANIZATION_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAACqSURBVEhL7ZFbCoRADAQ9wV7JX6++4J00kCWORXbM6Ci+oL4m3V2ITdv1u3IywfD9CHjMUyDQ9VJHVJCuKwj84yECTBuIudxbgLkMKKZMAnQ2YrM/Ac5VOFZQ3WGzs5+M0GrSzZlAQHQFGKRAQKEITAmOQEFzEdSNV2CgblQTCFhQfAGaQTCinEwQuQJHgJqCjICAgowQ+gJcjUhsQYB3l3zYF1Tk6oKuHwG5IBiIz7bx+QAAAABJRU5ErkJggg=="

// SSL/TLS certificates
const options = {
  key: fs.readFileSync('server.key'), // Replace with the path to your private key
  cert: fs.readFileSync('server.crt'), // Replace with the path to your certificate
};







// Helper functions:

function generate_JWT_entity_statement(sub_name, db) {
  return new Promise((resolve, reject) => {
      const queryIssuer = `SELECT organization_name, homepage_uri, logo_uri FROM issuers WHERE sub_name = ?`;
      const queryKeys = `SELECT key_id, x, y FROM issuer_public_keys WHERE sub_name = ?`;

      db.get(queryIssuer, [sub_name], (err, issuer) => {
          if (err) return reject({ status: 500, error: 'Database query failed' });
          if (!issuer) return reject({ status: 404, error: 'Issuer not found' });
          
          db.all(queryKeys, [sub_name], (err, keys) => {
              if (err) return reject({ status: 500, error: 'Database query failed' });

              const isTrustAnchor = sub_name === `${THIS_URL}/${TRUST_ANCHOR_NAME}`;
              const entityStatement = {
                  sub: sub_name,
                  metadata: {
                      federation_entity: {
                          organization_name: issuer.organization_name,
                          homepage_uri: issuer.homepage_uri,
                          logo_uri: issuer.logo_uri,
                          ...(isTrustAnchor && {
                              federation_fetch_endpoint: `${THIS_URL}/${TRUST_ANCHOR_NAME}/fetch`,
                              federation_list_endpoint: `${THIS_URL}/${TRUST_ANCHOR_NAME}/subordinate_listing`
                          })
                      }
                  },
                  jwks: {
                      keys: keys.map(key => ({
                          kty: JWKS_KTY,
                          crv: JWKS_CURVE,
                          kid: key.key_id,
                          x: key.x,
                          y: key.y
                      }))
                  },
                  iss: `${THIS_URL}/${TRUST_ANCHOR_NAME}`,
                  exp: Math.floor(Date.now() / 1000) + TOKEN_DURATION,
                  iat: Math.floor(Date.now() / 1000),
                  jti: require('crypto').randomBytes(16).toString('hex')
              };
              resolve(entityStatement);
          });
      });
  });
}

function generate_JWT_header_and_signing_JWK(db) {
  return new Promise((resolve, reject) => {
      const querySigningKeyPrivate = `SELECT d, this_key_id FROM registry_private_keys ORDER BY this_key_id DESC LIMIT 1;`;
      const querySigningKeyPublic = `SELECT x, y FROM registry_public_keys WHERE this_key_id = ?`;

      db.get(querySigningKeyPrivate, (err, private_key_data) => {
          if (err) return reject({ status: 500, error: 'Database query failed' });
          if (!private_key_data) return reject({ status: 404, error: 'Signing key not found' });
          
          db.get(querySigningKeyPublic, [private_key_data['this_key_id']], (err, public_key_data) => {
              if (err) return reject({ status: 500, error: 'Database query failed' });
              
              resolve({
                  jwt_header: {
                      kid: private_key_data['this_key_id'],
                      typ: "entity-statement+jwt",
                      alg: JWT_ALG,
                  },
                  signing_jwk: {
                      kty: JWKS_KTY,
                      crv: JWKS_CURVE,
                      kid: private_key_data['this_key_id'],
                      x: public_key_data['x'],
                      y: public_key_data['y'],
                      d: private_key_data['d']
                  }
              });
          });
      });
  });
}







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







// Query the database for internal issuers before startup
const fetchInternalIssuers = () => {
  return new Promise((resolve, reject) => { // Get only issuers which have this website at the front
    const query = `SELECT sub_name FROM issuers WHERE approval_status <> 0 AND sub_name LIKE ?`;
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

        // Serve the .well-known/openid-federation for the issuer
        app.get(`/issuers/${issuer}/.well-known/openid-federation`, (req, res) => {
          res.status(200).json({});
        });

        console.log(`Serving .well-known/openid-federation for ${issuer}`);
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



// Fetch endpoint - checks if the sub_name exists in the database and returns a signed ES
app.get(`/${TRUST_ANCHOR_NAME}/fetch`, async (req, res) => {
  try {
    const subUrl = req.query.sub;
    if (!subUrl) return res.status(400).json({ error: 'Missing sub query parameter' });
    
    const { jwt_header, signing_jwk } = await generate_JWT_header_and_signing_JWK(db);
    const entityStatement = await generate_JWT_entity_statement(subUrl, db);
  
    const jwt = await new jose.SignJWT(entityStatement)
        .setProtectedHeader(jwt_header)
        .sign(signing_jwk);
    
    res.status(200).json({ jwt });
} catch (error) {
    console.log(error);
    res.status(error.status || 500).json({ error: error.error || 'Internal server error' });
}
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