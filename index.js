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
const THIS_URL = "https://w3447ka4vf.execute-api.us-east-1.amazonaws.com/dev"; // For determining internal path for fetch statement (before issuers subfolder)
const TOKEN_DURATION = 60 * 60 * 24 * 1; // in seconds = 1 day

const THIS_ORGANIZATION_NAME = "Digital Credentials Consortium (TEST)"
const THIS_ORGANIZATION_HOMEPAGE_URI = "https://digitalcredentials.mit.edu"
const THIS_ORGANIZATION_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAACqSURBVEhL7ZFbCoRADAQ9wV7JX6++4J00kCWORXbM6Ci+oL4m3V2ITdv1u3IywfD9CHjMUyDQ9VJHVJCuKwj84yECTBuIudxbgLkMKKZMAnQ2YrM/Ac5VOFZQ3WGzs5+M0GrSzZlAQHQFGKRAQKEITAmOQEFzEdSNV2CgblQTCFhQfAGaQTCinEwQuQJHgJqCjICAgowQ+gJcjUhsQYB3l3zYF1Tk6oKuHwG5IBiIz7bx+QAAAABJRU5ErkJggg=="
const THIS_ORGANIZATION_POLICY_URI = "https://test.registry.dcconsortium.org/governance-policy"
const THIS_ORGANIZATION_LEGAL_NAME = "Digital Credentials Consortium Legal Name (TEST)"

// SSL/TLS certificates
const options = {
  key: fs.readFileSync('server.key'), // Replace with the path to your private key
  cert: fs.readFileSync('server.crt'), // Replace with the path to your certificate
};







// Helper functions:

// Generate an entity statement, given the subject name. Accepts the trust anchor as a subject.
// Otherwise searches for a subject in the issuers table.
function generate_JWT_entity_statement(db, sub_name) {
  const isTrustAnchor = sub_name === `${THIS_URL}/${TRUST_ANCHOR_NAME}`;
  const queryTrustAnchorKeys = `SELECT key_id, jwks_kty, jwks_curve, jwt_alg, pub_key FROM registry_public_keys`;

  const entityStatement = {
      sub: sub_name,
      metadata: {
          federation_entity: {
              ...(isTrustAnchor ? {
                  organization_name: THIS_ORGANIZATION_NAME,
                  homepage_uri: THIS_ORGANIZATION_HOMEPAGE_URI,
                  logo_uri: THIS_ORGANIZATION_LOGO_URI,
                  policy_uri: THIS_ORGANIZATION_POLICY_URI,
                  federation_fetch_endpoint: `${THIS_URL}/${TRUST_ANCHOR_NAME}/fetch`,
                  federation_list_endpoint: `${THIS_URL}/${TRUST_ANCHOR_NAME}/subordinate_listing`
              } : {
                  organization_name: '',
                  homepage_uri: '',
                  logo_uri: ''
              })
          },
          ...(isTrustAnchor ? {
              institution_additional_information: {
                  legal_name: THIS_ORGANIZATION_LEGAL_NAME
              }
          } : {})
      },
      iss: `${THIS_URL}/${TRUST_ANCHOR_NAME}`,
      exp: Math.floor(Date.now() / 1000) + TOKEN_DURATION,
      iat: Math.floor(Date.now() / 1000),
      jti: require('crypto').randomBytes(16).toString('hex')
  };

  // Only include jwks for trust anchor
  if (isTrustAnchor) {
      entityStatement.jwks = { keys: [] };
  }

  return new Promise((resolve, reject) => {
      if (isTrustAnchor) {
          db.all(queryTrustAnchorKeys, [], (err, keys) => {
              if (err) return reject({ status: 500, error: 'Database query failed' });

              entityStatement.jwks.keys = keys.map(key => {
                  const pubKey = JSON.parse(key.pub_key);
                  return {
                      kty: key.jwks_kty,
                      crv: key.jwks_curve,
                      kid: key.key_id,
                      x: pubKey.x,
                      y: pubKey.y
                  };
              });
              return resolve(entityStatement);
          });
      } else {
          db.get(`SELECT organization_name, homepage_uri, logo_uri, legal_name, ctid, rorid FROM issuers WHERE sub_name = ?`, [sub_name], (err, issuer) => {
              if (err) return reject({ status: 500, error: 'Database query failed' });
              if (!issuer) return reject({ status: 404, error: 'Issuer not found' });

              entityStatement.metadata.federation_entity.organization_name = issuer.organization_name;
              entityStatement.metadata.federation_entity.homepage_uri = issuer.homepage_uri;
              entityStatement.metadata.federation_entity.logo_uri = issuer.logo_uri;

              // Add new metadata fields
              if (issuer.legal_name) {
                  entityStatement.metadata.institution_additional_information = {
                      legal_name: issuer.legal_name
                  };
              }

              if (issuer.ctid) {
                  entityStatement.metadata.credential_registry_entity = {
                      ctid: issuer.ctid,
                      ce_url: `https://credentialengineregistry.org/resources/${issuer.ctid}`
                  };
              }

              if (issuer.rorid) {
                  entityStatement.metadata.ror_entity = {
                      rorid: issuer.rorid,
                      ror_url: `https://ror.org/${issuer.rorid}`
                  };
              }

              resolve(entityStatement);
          });
      }
  });
}

// Generate the JWT header and full private JWK for JWT signing. For signing on behalf of the issuer registry.
// Uses first key in registry_private_keys and registry_public_keys tables
function generate_JWT_header_and_signing_JWK_registry(db) {
  return new Promise((resolve, reject) => {
      const querySigningKeyPrivate = `SELECT priv_key, key_id FROM registry_private_keys ORDER BY key_id DESC LIMIT 1;`;
      const querySigningKeyPublic = `SELECT jwks_kty, jwks_curve, jwt_alg, pub_key FROM registry_public_keys WHERE key_id = ?`;

      db.get(querySigningKeyPrivate, (err, private_key_data) => {
          if (err) return reject({ status: 500, error: 'Database query failed' });
          if (!private_key_data) return reject({ status: 404, error: 'Signing key not found' });
          
          db.get(querySigningKeyPublic, [private_key_data['key_id']], (err, public_key_data) => {
              if (err) return reject({ status: 500, error: 'Database query failed' });
              const pubKey = JSON.parse(public_key_data.pub_key); // Parse the JSON string

              resolve({
                  jwt_header: {
                      kid: private_key_data['key_id'],
                      typ: "entity-statement+jwt",
                      alg: public_key_data['jwt_alg'],
                  },
                  signing_jwk: {
                      kty: public_key_data.jwks_kty,
                      crv: public_key_data.jwks_curve,
                      kid: private_key_data['key_id'],
                      x: pubKey['x'],
                      y: pubKey['y'],
                      d: private_key_data['priv_key']
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







// Serve subordinate listing endpoint - queries all issuers
app.get(`/${TRUST_ANCHOR_NAME}/subordinate_listing`, async (req, res) => {
  const query = `SELECT sub_name FROM issuers`;

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



// Serve fetch endpoint - checks if the sub_name exists in the database and returns a signed ES
app.get(`/${TRUST_ANCHOR_NAME}/fetch`, async (req, res) => {
  if(req.query.sub==`${THIS_URL}/${TRUST_ANCHOR_NAME}`) { // This trust anchor shall not be returned using this method
    return res.status(404).json({ error: 'Issuer not found' });
  }
  try {
    const subUrl = req.query.sub;
    if (!subUrl) return res.status(400).json({ error: 'Missing sub query parameter' });
    
    const { jwt_header, signing_jwk } = await generate_JWT_header_and_signing_JWK_registry(db);
    const entityStatement = await generate_JWT_entity_statement(db, subUrl);
    const jwt = await new jose.SignJWT(entityStatement)
        .setProtectedHeader(jwt_header)
        .sign(signing_jwk);
    
    res.status(200)
      .set('Content-Type', 'application/entity-statement+jwt')
      .send(jwt);
  } catch (error) {
      console.log(error);
      res.status(error.status || 500).json({ error: error.error || 'Internal server error' });
  }
});



// Trust anchor well-known endpoint
app.get(`/${TRUST_ANCHOR_NAME}/.well-known/openid-federation`, async (req, res) => {
  try {
    const { jwt_header, signing_jwk } = await generate_JWT_header_and_signing_JWK_registry(db);
    const entityStatement = await generate_JWT_entity_statement(db, `${THIS_URL}/${TRUST_ANCHOR_NAME}`);
  
    const jwt = await new jose.SignJWT(entityStatement)
        .setProtectedHeader(jwt_header)
        .sign(signing_jwk);
    
    
    res.status(200)
    .set('Content-Type', 'application/entity-statement+jwt')
    .send(jwt);

  } catch (error) {
      console.log(error);
      res.status(error.status || 500).json({ error: error.error || 'Internal server error' });
  }
});





// Start the server with HTTPS
https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS Server listening on port ${port}.`);
});