import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const USE_DYNAMODB = process.env.USE_DYNAMODB === "true";
const dynamoClient = USE_DYNAMODB ? new DynamoDBClient({}) : null;

const ISSUER_REGISTRY_SECRET_KEY = "nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA";

const THIS_URL = "https://w3447ka4vf.execute-api.us-east-1.amazonaws.com/dev"; // For determining internal path for fetch statement (before issuers subfolder)
const THIS_ORGANIZATION_NAME = "Digital Credentials Consortium (TEST)";
const THIS_ORGANIZATION_HOMEPAGE_URI = "https://digitalcredentials.mit.edu";
const THIS_ORGANIZATION_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAACqSURBVEhL7ZFbCoRADAQ9wV7JX6++4J00kCWORXbM6Ci+oL4m3V2ITdv1u3IywfD9CHjMUyDQ9VJHVJCuKwj84yECTBuIudxbgLkMKKZMAnQ2YrM/Ac5VOFZQ3WGzs5+M0GrSzZlAQHQFGKRAQKEITAmOQEFzEdSNV2CgblQTCFhQfAGaQTCinEwQuQJHgJqCjICAgowQ+gJcjUhsQYB3l3zYF1Tk6oKuHwG5IBiIz7bx+QAAAABJRU5ErkJggg==";
const THIS_ORGANIZATION_POLICY_URI = "https://test.registry.dcconsortium.org/governance-policy";
const THIS_ORGANIZATION_LEGAL_NAME = "Digital Credentials Consortium, Inc.";

import { SignJWT } from 'jose';

import express from 'express';
import https from 'https';
import fs from 'fs';


async function generateEntityStatement(sub) {
    console.log("in generateEntityStatement");
    const isTrustAnchor = sub === THIS_URL;
    const queryTrustAnchorKeys = `SELECT key_id, jwks_kty, jwks_curve, jwt_alg, pub_key FROM registry_public_keys`;

    const entityStatement = {
        sub: sub,
        metadata: {
            federation_entity: {
                ...(isTrustAnchor ? {
                    organization_name: THIS_ORGANIZATION_NAME,
                    homepage_uri: THIS_ORGANIZATION_HOMEPAGE_URI,
                    logo_uri: THIS_ORGANIZATION_LOGO_URI,
                    policy_uri: THIS_ORGANIZATION_POLICY_URI,
                    federation_fetch_endpoint: `https://issuerregistry.example.com/fetch`,
                    federation_list_endpoint: `https://issuerregistry.example.com/subordinate_listing`
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
        iss: THIS_URL,
        exp: Math.floor(Date.now() / 1000) + 86400,
        iat: Math.floor(Date.now() / 1000),
        jti: Math.random().toString(36).slice(2)
    };

    // Only include jwks for trust anchor
    if (isTrustAnchor) {
        entityStatement.jwks = { keys: [] };
    }

    if (isTrustAnchor) {
        if (USE_DYNAMODB) {
            const keyParams = { TableName: "db-registry_public_keys" };
            const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
            entityStatement.jwks.keys = keyResult.Items.map(item => ({
                kty: item.jwks_kty.S,
                crv: item.jwks_curve.S,
                kid: item.key_id.S,
                x: JSON.parse(item.pub_key.S).x,
                y: JSON.parse(item.pub_key.S).y
            }));
        } else {
            const keys = await new Promise((resolve, reject) => {
                db.all(queryTrustAnchorKeys, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
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
        }
        return entityStatement;
    } else {
        if (USE_DYNAMODB) {
            const params = {
                TableName: "db-issuers",
                FilterExpression: "sub_name = :sub",
                ExpressionAttributeValues: {
                    ":sub": { S: sub }
                }
            };
            const result = await dynamoClient.send(new ScanCommand(params));
            if (!result.Items || result.Items.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ error: "Issuer not found" }) };
            }
            const item = result.Items[0];
            entityStatement.metadata.federation_entity.organization_name = item.organization_name.S;
            entityStatement.metadata.federation_entity.homepage_uri = item.homepage_uri.S;
            entityStatement.metadata.federation_entity.logo_uri = item.logo_uri.S;

            if (item.legal_name) {
                entityStatement.metadata.institution_additional_information = {
                    legal_name: item.legal_name.S
                };
            }

            if (item.ctid) {
                entityStatement.metadata.credential_registry_entity = {
                    ctid: item.ctid.S,
                    ce_url: `https://credentialengineregistry.org/resources/${item.ctid.S}`
                };
            }

            if (item.rorid) {
                entityStatement.metadata.ror_entity = {
                    rorid: item.rorid.S,
                    ror_url: `https://ror.org/${item.rorid.S}`
                };
            }
        } else {
            const issuer = await new Promise((resolve, reject) => {
                console.log(sub);
                db.get(`SELECT organization_name, homepage_uri, logo_uri, legal_name, ctid, rorid FROM issuers WHERE sub_name = ?`, [sub], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            if (!issuer) {
                return { statusCode: 404, body: JSON.stringify({ error: "Issuer not found" }) };
            }

            entityStatement.metadata.federation_entity.organization_name = issuer.organization_name;
            entityStatement.metadata.federation_entity.homepage_uri = issuer.homepage_uri;
            entityStatement.metadata.federation_entity.logo_uri = issuer.logo_uri;

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
        }
        return entityStatement;
    }
}

function extractSValues(input) {
    const output = {};
    for (const key in input) {
        if (input[key].S) {
            output[key] = input[key].S;
        }
    }
    return output;
}

async function signEntityStatement(entityStatement) {
    let publicKeyData;
    let pub;
    if (USE_DYNAMODB) {
        console.log("in dynamodb");
        const keyParams = { TableName: "db-registry_public_keys" };
        const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
        publicKeyData = keyResult.Items.find(item => item.key_id.S === "issuerregistry-key1");

        publicKeyData = extractSValues(publicKeyData);
        pub = JSON.parse(publicKeyData.pub_key);
    } else {
        publicKeyData = await new Promise((resolve, reject) => {
            db.get("SELECT jwks_kty, jwks_curve, pub_key, key_id FROM registry_public_keys WHERE key_id = ?", ["issuerregistry-key1"], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        pub = JSON.parse(publicKeyData.pub_key);
    }
    if (!publicKeyData) {
        throw new Error("Signing public key not found");
    }
    const signingJWK = {
        kty: publicKeyData.jwks_kty,
        crv: publicKeyData.jwks_curve,
        kid: publicKeyData.key_id,
        x: pub.x,
        y: pub.y,
        d: ISSUER_REGISTRY_SECRET_KEY
    };
    console.log(signingJWK);
    
    const jwtHeader = { alg: "ES256", typ: "entity-statement+jwt", kid: publicKeyData.key_id };
    const jwt = await new SignJWT(entityStatement)
        .setProtectedHeader(jwtHeader)
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(signingJWK);
    return jwt;
}
const tableName = "db-issuers"; // Replace with actual DynamoDB table name

function convertToDynamoDB(queryObj) {
    const { columns, table_name, comparison_var, comparison, comparison_val } = queryObj;

    const comparisonOperators = {
        '=': '=',
        '<>': '<>',
        '>': '>',
        '<': '<',
        '>=': '>=',
        '<=': '<='
    };

    if (!comparisonOperators[comparison]) {
        throw new Error('Unsupported comparison operator');
    }

    return {
        TableName: `db-${table_name}`,
        FilterExpression: `${comparison_var} ${comparisonOperators[comparison]} :val`,
        ExpressionAttributeValues: {
            ':val': { N: String(comparison_val) }
        },
        ProjectionExpression: columns.join(', ')
    };
}

let db;
if (!USE_DYNAMODB) {
    const sqlite3 = await import('sqlite3');
    db = new sqlite3.default.Database("issuerreg.db", (err) => {
        if (err) {
            console.error("Failed to connect to the SQLite database:", err.message);
        } else {
            console.log("Connected to the SQLite database.");
        }
    });
}

// **Lambda Handler Function**
export async function lambdaHandler(event) {
    const routeKey = event.routeKey;
    if (routeKey == `GET /subordinate_listing`) {
        try {
            if (USE_DYNAMODB) {
                const command = new ScanCommand({
                    TableName: "db-issuers",
                    ProjectionExpression: "sub_name"
                });
                const { Items } = await dynamoClient.send(command);
                const subNames = Items.map((item) => item.sub_name.S);
                return { statusCode: 200, body: JSON.stringify(subNames) };
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT sub_name FROM issuers", [], (err, rows) => {
                        if (err) {
                            console.error("Error executing query:", err.message);
                            resolve({ statusCode: 500, body: JSON.stringify({ error: "Database query failed" }) });
                        } else {
                            const subNames = rows.map((row) => row.sub_name);
                            resolve({ statusCode: 200, body: JSON.stringify(subNames) });
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Error:", error.message);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to process request" }) };
        }
    } else if (routeKey == `GET /.well-known/openid-federation`) {
        try {
            const entityStatement = await generateEntityStatement(THIS_URL);
            console.log("entityStatement");
            console.log(entityStatement);
            const jwt = await signEntityStatement(entityStatement);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: jwt
            };
        } catch (error) {
            console.error("Error:", error.message);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to process request" }) };
        }
    } else if (routeKey == `GET /fetch`) {
        const subValue = event.queryStringParameters?.sub;
        if (!subValue) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing sub parameter" }) };
        }
        try {
            const entityStatement = await generateEntityStatement(subValue);
            if (entityStatement.statusCode) { // If there is an error
                return entityStatement; // Return 404 response directly if issuer not found
            }
            const jwt = await signEntityStatement(entityStatement);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: jwt
            };
        } catch (error) {
            console.error("Error:", error.message);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to process request" }) };
        }
    } else {
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
};

// **Local Express Server (For Testing Only)**
if (!USE_DYNAMODB) {

    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json()); // Middleware to parse JSON request bodies

    app.all("*", async (req, res) => {
        const event = {
            routeKey: `${req.method} ${req.path}`,
            queryStringParameters: req.query,
            body: req.body ? JSON.stringify(req.body) : undefined
        };

        try {
            const response = await lambdaHandler(event);
            res.status(response.statusCode).set(response.headers || {}).send(response.body);
        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    const options = {
        key: fs.readFileSync("server.key"),
        cert: fs.readFileSync("server.crt"),
    };

    https.createServer(options, app).listen(port, () => {
        console.log(`HTTPS Server listening on port ${port}.`);
    });
}
