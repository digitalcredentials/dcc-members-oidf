import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const USE_DYNAMODB = process.env.USE_DYNAMODB === "true";
const IS_TEST_OR_PROD = process.env.IS_TEST_OR_PROD || "t"; // Default to test if not set
console.log(`USE_DYNAMODB value (store): ${USE_DYNAMODB}`);
console.log(`IS_TEST_OR_PROD value: ${IS_TEST_OR_PROD}`);

const dynamoClient = USE_DYNAMODB ? new DynamoDBClient({}) : null;

const ISSUER_REGISTRY_SECRET_KEY = "nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA";

const THIS_URL = "https://test.registry.dcconsortium.org"; // For determining internal path for fetch statement (before issuers subfolder)
const THIS_ORGANIZATION_NAME = "Digital Credentials Consortium (TEST)";
const THIS_ORGANIZATION_HOMEPAGE_URI = "https://digitalcredentials.mit.edu";
const THIS_ORGANIZATION_LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAACqSURBVEhL7ZFbCoRADAQ9wV7JX6++4J00kCWORXbM6Ci+oL4m3V2ITdv1u3IywfD9CHjMUyDQ9VJHVJCuKwj84yECTBuIudxbgLkMKKZMAnQ2YrM/Ac5VOFZQ3WGzs5+M0GrSzZlAQHQFGKRAQKEITAmOQEFzEdSNV2CgblQTCFhQfAGaQTCinEwQuQJHgJqCjICAgowQ+gJcjUhsQYB3l3zYF1Tk6oKuHwG5IBiIz7bx+QAAAABJRU5ErkJggg==";
const THIS_ORGANIZATION_POLICY_URI = "https://test.registry.dcconsortium.org/governance-policy";
const THIS_ORGANIZATION_LEGAL_NAME = "Digital Credentials Consortium";

import { SignJWT } from 'jose';

import express from 'express';
import https from 'https';
import fs from 'fs';


async function generateEntityStatement(sub) {
    console.log("in generateEntityStatement");
    const isTrustAnchor = sub === THIS_URL;
    const queryTrustAnchorKeys = `SELECT key_id, jwks_kty, jwks_curve, jwt_alg, pub_key FROM registry-public-keys`;

    const entityStatement = {
        sub: sub,
        metadata: {
            federation_entity: {
                ...(isTrustAnchor ? {
                    organization_name: THIS_ORGANIZATION_NAME,
                    homepage_uri: THIS_ORGANIZATION_HOMEPAGE_URI,
                    logo_uri: THIS_ORGANIZATION_LOGO_URI,
                    policy_uri: THIS_ORGANIZATION_POLICY_URI,
                    federation_fetch_endpoint: `${THIS_URL}/fetch`,
                    federation_list_endpoint: `${THIS_URL}/subordinate_listing`
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
            console.log("in dynamodb");
            const keyParams = { TableName: `dcc-oidf-${IS_TEST_OR_PROD}-db-registry-public-keys` };
            const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
            entityStatement.jwks.keys = keyResult.Items.map(item => ({
                kty: item.jwks_kty.S,
                crv: item.jwks_curve.S,
                kid: item.key_id.S,
                x: JSON.parse(item.pub_key.S).x,
                y: JSON.parse(item.pub_key.S).y
            }));
        } else {
            console.log("in sqlite");
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
            console.log("in dynamodb");
            const params = {
                TableName: `dcc-oidf-${IS_TEST_OR_PROD}-db-issuers`,
                FilterExpression: "sub_name = :sub",
                ExpressionAttributeValues: {
                    ":sub": { S: sub }
                }
            };
            const result = await dynamoClient.send(new ScanCommand(params));
            if (!result.Items || result.Items.length === 0) {
                return { statusCode: 404, body: JSON.stringify({
                    error: "not_found",
                    error_description: "The requested Entity Identifier cannot be found."
                }) };
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
                    url: `https://credentialengineregistry.org/resources/${item.ctid.S}`
                };
            }

            if (item.rorid) {
                entityStatement.metadata.ror_entity = {
                    rorid: item.rorid.S,
                    url: `https://ror.org/${item.rorid.S}`
                };
            }
        } else {
            console.log("in sqlite");
            const issuer = await new Promise((resolve, reject) => {
                console.log(sub);
                db.get(`SELECT organization_name, homepage_uri, logo_uri, legal_name, ctid, rorid FROM issuers WHERE sub_name = ?`, [sub], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            if (!issuer) {
                return {
                    statusCode: 404, body: JSON.stringify({
                        error: "not_found",
                        error_description: "The requested Entity Identifier cannot be found."
                    })
                };
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
                    url: `https://credentialengineregistry.org/resources/${issuer.ctid}`
                };
            }

            if (issuer.rorid) {
                entityStatement.metadata.ror_entity = {
                    rorid: issuer.rorid,
                    url: `https://ror.org/${issuer.rorid}`
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
        const keyParams = { TableName: `dcc-oidf-${IS_TEST_OR_PROD}-db-registry-public-keys` };
        const keyResult = await dynamoClient.send(new ScanCommand(keyParams));
        publicKeyData = keyResult.Items.find(item => item.key_id.S === "issuerregistry-key1");

        publicKeyData = extractSValues(publicKeyData);
        pub = JSON.parse(publicKeyData.pub_key);
    } else {
        console.log("in sqlite");
        publicKeyData = await new Promise((resolve, reject) => {
            db.get("SELECT jwks_kty, jwks_curve, pub_key, key_id FROM registry-public-keys WHERE key_id = ?", ["issuerregistry-key1"], (err, row) => {
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
const tableName = "dcc-oidf-t-db-issuers"; // Replace with actual DynamoDB table name

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
                console.log("in dynamodb");
                const command = new ScanCommand({
                    TableName: `dcc-oidf-${IS_TEST_OR_PROD}-db-issuers`,
                    ProjectionExpression: "sub_name"
                });
                const { Items } = await dynamoClient.send(command);
                const subNames = Items.map((item) => item.sub_name.S);
                return { statusCode: 200, body: JSON.stringify(subNames) };
            } else {
                console.log("in sqlite");
                return new Promise((resolve) => {
                    db.all("SELECT sub_name FROM issuers", [], (err, rows) => {
                        if (err) {
                            console.error("Error executing query:", err.message);
                            resolve({ statusCode: 500, body: JSON.stringify({
                                error: "server_error",
                                error_description: "The server encountered an error: database query failed."
                            }) });
                        } else {
                            const subNames = rows.map((row) => row.sub_name);
                            resolve({ statusCode: 200, body: JSON.stringify(subNames) });
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Error:", error.message);
            return {
                statusCode: 500, body: JSON.stringify({
                    error: "server_error",
                    error_description: "The server encountered an error while processing the request."
                })
            };
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
            return {
                statusCode: 500, body: JSON.stringify({
                    error: "server_error",
                    error_description: "The server encountered an error while processing the request."
                })
            };
        }
    } else if (routeKey == `GET /fetch`) {
        const subValue = event.queryStringParameters?.sub;
        if (!subValue) {
            return {
                statusCode: 400, body: JSON.stringify({
                    error: "invalid_request",
                    error_description: "Required request parameter [sub] was missing."
                }) };
        }

        // Check for extra parameters
        const allowedParams = ['sub'];
        const extraParams = Object.keys(event.queryStringParameters || {}).filter(param => !allowedParams.includes(param));
        if (extraParams.length > 0) {
            return {
                statusCode: 400, body: JSON.stringify({
                    error: "unsupported_parameter",
                    error_description: "The server does not support the requested parameter."
                }) };
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
            return {
                statusCode: 500, body: JSON.stringify({
                    error: "server_error",
                    error_description: "The server encountered an error while processing the request."
                })
            };
        }
    } else {
        return {
            statusCode: 404, body: JSON.stringify({
                error: "not_found",
                error_description: "The requested route cannot be found."
            })
        };
    }
};

// **Local Express Server (For Testing Only)**
if (!USE_DYNAMODB) {
    console.log("in local express server");
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
            // Only return 500 for actual server errors, not for 404s
            if (error.statusCode === 404) {
                res.status(404).json({
                    error: "not_found",
                    error_description: "The requested route cannot be found."
                });
            } else {
                res.status(500).json({
                    error: "server_error",
                    error_description: "The server encountered an error while processing the request."
                });
            }
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
