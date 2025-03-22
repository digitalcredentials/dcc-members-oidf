const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const USE_DYNAMODB = process.env.USE_DYNAMODB === "true";
const dynamoClient = USE_DYNAMODB ? new DynamoDBClient({}) : null;

ISSUER_REGISTRY_SECRET_KEY = "nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA";

const TRUST_ANCHOR_NAME = "issuer-registry";

const { SignJWT } = require('jose');
const { TextEncoder } = require('util');

async function generateEntityStatement(sub) {
    let metadata = {};
    if (sub === `did:web:${TRUST_ANCHOR_NAME}`) {
        // Trust anchor metadata (hardcoded)
        metadata = {
            organization_name: "Issuer Registry Organization",
            homepage_uri: "https://issuerregistry.example.com",
            logo_uri: "data:image/png;base64,PLACEHOLDER"
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
            if (result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                metadata = {
                    organization_name: item.organization_name.S,
                    homepage_uri: item.homepage_uri.S,
                    logo_uri: item.logo_uri.S
                };
            } else {
                throw new Error("Issuer not found");
            }
        } else {
            metadata = await new Promise((resolve, reject) => {
                db.get("SELECT organization_name, homepage_uri, logo_uri FROM issuers WHERE sub_name = ? ", [sub], (err, row) => {
                    if (err) return reject(err);
                resolve(row);
            });
        });
        if (!metadata) throw new Error("Issuer not found");
    }
}
return {
    sub: sub,
    metadata: {
        federation_entity: metadata
    },
    iss: `did:web:${TRUST_ANCHOR_NAME}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    jti: Math.random().toString(36).slice(2)
};
}

async function signEntityStatement(entityStatement) {
    const secret = new TextEncoder().encode(ISSUER_REGISTRY_SECRET_KEY);
    const jwt = await new SignJWT(entityStatement)
        .setProtectedHeader({ alg: "HS256", typ: "entity-statement+jwt" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secret);
    return jwt;
}


async function generateEntityStatement(sub) {
    let metadata = {};
    if (sub === `did:web:${TRUST_ANCHOR_NAME}`) {
        // Trust anchor metadata (hardcoded)
        metadata = {
            organization_name: "Issuer Registry Organization",
            homepage_uri: "https://issuerregistry.example.com",
            logo_uri: "data:image/png;base64,PLACEHOLDER"
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
            if (result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                metadata = {
                    organization_name: item.organization_name.S,
                    homepage_uri: item.homepage_uri.S,
                    logo_uri: item.logo_uri.S
                };
            } else {
                throw new Error("Issuer not found");
            }
        } else {
            metadata = await new Promise((resolve, reject) => {
                db.get("SELECT organization_name, homepage_uri, logo_uri FROM issuers WHERE sub_name = ?", [sub], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            if (!metadata) throw new Error("Issuer not found");
        }
    }
    return {
        sub: sub,
        metadata: {
            federation_entity: metadata
        },
        iss: `did:web:${TRUST_ANCHOR_NAME}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
        jti: Math.random().toString(36).slice(2)
    };
}

async function signEntityStatement(entityStatement) {
    const secret = new TextEncoder().encode(ISSUER_REGISTRY_SECRET_KEY);
    const jwt = await new SignJWT(entityStatement)
        .setProtectedHeader({ alg: "HS256", typ: "entity-statement+jwt" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secret);
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
    const sqlite3 = require("sqlite3").verbose();
    db = new sqlite3.Database("issuerreg.db", (err) => {
        if (err) {
            console.error("Failed to connect to the SQLite database:", err.message);
        } else {
            console.log("Connected to the SQLite database.");
        }
    });
}

// **Lambda Handler Function**
exports.lambdaHandler = async (event) => {
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
    } else if (routeKey == `GET /${TRUST_ANCHOR_NAME}/fetch`) {
        const subValue = event.queryStringParameters?.sub;
        if (!subValue) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing sub parameter" }) };
        }
        try {
            const entityStatement = await generateEntityStatement(subValue);
            const jwt = await signEntityStatement(entityStatement);
            return {
                statusCode: 200, headers: { 'Content-Type': 'application/entity-statement+jwt' },
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
    const express = require("express");
    const https = require("https");
    const fs = require("fs");

    const app = express();
    const port = process.env.PORT || 3000;

    app.get(`/${TRUST_ANCHOR_NAME}/subordinate_listing`, async (req, res) => {
        const response = await exports.lambdaHandler({ routeKey: `GET /${TRUST_ANCHOR_NAME}/subordinate_listing` });
        res.status(response.statusCode).json(JSON.parse(response.body));
    });

    const options = {
        key: fs.readFileSync("server.key"),
        cert: fs.readFileSync("server.crt"),
    };

    https.createServer(options, app).listen(port, () => {
        console.log(`HTTPS Server listening on port ${port}.`);
    });
}
