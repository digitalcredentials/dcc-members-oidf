import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const USE_DYNAMODB = process.env.USE_DYNAMODB === "true";
const dynamoClient = USE_DYNAMODB ? new DynamoDBClient({}) : null;

const ISSUER_REGISTRY_SECRET_KEY = "nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA";

const TRUST_ANCHOR_NAME = "issuer-registry";


import { SignJWT } from 'jose';

// import sqlite3 from 'sqlite3';
import express from 'express';
import https from 'https';
import fs from 'fs';


async function generateEntityStatement(sub) {

    console.log("in generateEntityStatement");
    let metadata = {};
    if (sub === `did:web:${TRUST_ANCHOR_NAME}`) {
        metadata = {
            organization_name: "Issuer Registry Organization",
            homepage_uri: "https://issuerregistry.example.com",
            logo_uri: "data:image/png;base64,PLACEHOLDER",
            policy_uri: "https://issuerregistry.example.com/governance-policy",
            federation_fetch_endpoint: `https://issuerregistry.example.com/${TRUST_ANCHOR_NAME}/fetch`,
            federation_list_endpoint:
                `https://issuerregistry.example.com/${TRUST_ANCHOR_NAME}/subordinate_listing`
        };
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
            metadata = {
                organization_name: item.organization_name.S,
                homepage_uri: item.homepage_uri.S,
                logo_uri: item.logo_uri.S
            };
        } else {
            metadata = await new Promise((resolve, reject) => {
                db.get("SELECT organization_name, homepage_uri, logo_uri FROM issuers WHERE sub_name = ?", [sub], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            if (!metadata) {
                return { statusCode: 404, body: JSON.stringify({ error: "Issuer not found" }) };
            }
        }
    }
    let jwksKeys = [];
    if (USE_DYNAMODB) {        
        if (sub === `did:web:${TRUST_ANCHOR_NAME}`) {
            console.log("in generateEntityStatement USE_DYNAMODB db-registry_public_keys");
            const keyParams = { TableName: "db-registry_public_keys" };
            const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
            jwksKeys = keyResult.Items.map(item => ({
                kty: item.jwks_kty.S,
                crv: item.jwks_curve.S,
                kid: item.key_id.S,
                x: JSON.parse(item.pub_key.S).x,
                y: JSON.parse(item.pub_key.S).y
            }));
            console.log("finished generateEntityStatement USE_DYNAMODB db-registry_public_keys");
            console.log(jwksKeys);

        } else {
            const keyParams = {
                TableName: "db-issuer_public_keys",
                FilterExpression: "sub_name = :sub",
                ExpressionAttributeValues: { ":sub": { S: sub } }
            };
            const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
            jwksKeys = keyResult.Items.map(item => ({
                kty: item.jwks_kty.S,
                crv: item.jwks_curve.S,
                kid: item.key_id.S,
                x: JSON.parse(item.pub_key.S).x,
                y: JSON.parse(item.pub_key.S).y
            }));
        }
    } else {
        const keyQuery = sub === `did:web:${TRUST_ANCHOR_NAME}` ?
            "SELECT key_id, jwks_kty, jwks_curve, jwt_alg, pub_key FROM registry_public_keys" :
            "SELECT key_id, jwks_kty, jwks_curve, jwt_alg, pub_key FROM issuer_public_keys WHERE sub_name = ?";
        const keyParams = sub === `did:web:${TRUST_ANCHOR_NAME}` ? [] : [sub];
        jwksKeys = await new Promise((resolve, reject) => {
            db.all(keyQuery, keyParams, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        jwksKeys = jwksKeys.map(key => {
            const pub = JSON.parse(key.pub_key);
            return { kty: key.jwks_kty, crv: key.jwks_curve, kid: key.key_id, x: pub.x, y: pub.y };
        });
    }
    
    return {
        sub: sub,
        metadata: { federation_entity: metadata },
        jwks: { keys: jwksKeys },
        iss: `did:web:${TRUST_ANCHOR_NAME}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
        jti: Math.random().toString(36).slice(2)
    };
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

function convertToSQL(queryObj) {
    const { columns, table_name, comparison_var, comparison, comparison_val } = queryObj;
    const columnStr = columns.join(', ');
    return `SELECT ${columnStr} FROM ${table_name} WHERE ${comparison_var} ${comparison} ${comparison_val};`;
}

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
    db = new sqlite3.Database("issuerreg.db", (err) => {
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
    if (routeKey == `GET /${TRUST_ANCHOR_NAME}/subordinate_listing`) {

        const queryObj = {
            columns: ['sub_name'],
            table_name: 'issuers',
            comparison_var: 'approval_status',
            comparison: '<>',
            comparison_val: '0'
        };

        try {
            if (USE_DYNAMODB) {
                const command = new ScanCommand(convertToDynamoDB(queryObj));
                const { Items } = await dynamoClient.send(command);
                const subNames = Items.map((item) => item.sub_name.S);
                return { statusCode: 200, body: JSON.stringify(subNames) };
            } else {
                return new Promise((resolve) => {
                    const query = convertToSQL(queryObj);
                    db.all(query, [], (err, rows) => {
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
    } else if (routeKey == `GET /${TRUST_ANCHOR_NAME}/.well-known/openid-federation`) {
        try {
            const entityStatement = await generateEntityStatement(`did:web:${TRUST_ANCHOR_NAME}`);
            console.log("entityStatement");
            console.log(entityStatement);
            const jwt = await signEntityStatement(entityStatement);
            // console.log(jwt);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: jwt
            };
        } catch (error) {
            console.error("Error:", error.message);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to process request" }) };
        }
    } else if (routeKey == `GET /${TRUST_ANCHOR_NAME}/fetch`) {
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
