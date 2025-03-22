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
        // also add .set('Content-Type', 'application/entity-statement+jwt')
        return { statusCode: 200,
            headers: {'Content-Type': 'application/entity-statement+jwt'},
            body: "eyJraWQiOiJpc3N1ZXJyZWdpc3RyeS1rZXkxIiwidHlwIjoiZW50aXR5LXN0YXRlbWVudCtqd3QiLCJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJodHRwczovL3czNDQ3a2E0dmYuZXhlY3V0ZS1hcGkudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vZGV2L2lzc3Vlci1yZWdpc3RyeSIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiRGlnaXRhbCBDcmVkZW50aWFscyBDb25zb3J0aXVtIChURVNUKSIsImhvbWVwYWdlX3VyaSI6Imh0dHBzOi8vZGlnaXRhbGNyZWRlbnRpYWxzLm1pdC5lZHUiLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFDcVNVUkJWRWhMN1pGYkNvUkFEQVE5d1Y3Slg2Kys0SjAwa0NXT1JYYk02Q2krb0w0bTNWMklUZHYxdTNJeXdmRDlDSGpNVXlEUTlWSkhWSkN1S3dqODR5RUNUQnVJdWR4YmdMa01LS1pNQW5RMllyTS9BYzVWT0ZaUTNXR3pzNStNMEdyU3pabEFRSFFGR0tSQVFLRUlUQW1PUUVGekVkU05WMkNnYmxRVENGaFFmQUdhUVRDaW5Fd1F1UUpIZ0pxQ2pJQ0Fnb3dRK2dKY2pVaHNRWUIzbDN6WUYxVGs2b0t1SHdHNUlCaUl6N2J4K1FBQUFBQkpSVTVFcmtKZ2dnPT0iLCJwb2xpY3lfdXJpIjoiaHR0cHM6Ly90ZXN0LnJlZ2lzdHJ5LmRjY29uc29ydGl1bS5vcmcvZ292ZXJuYW5jZS1wb2xpY3kiLCJmZWRlcmF0aW9uX2ZldGNoX2VuZHBvaW50IjoiaHR0cHM6Ly93MzQ0N2thNHZmLmV4ZWN1dGUtYXBpLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL2Rldi9pc3N1ZXItcmVnaXN0cnkvZmV0Y2giLCJmZWRlcmF0aW9uX2xpc3RfZW5kcG9pbnQiOiJodHRwczovL3czNDQ3a2E0dmYuZXhlY3V0ZS1hcGkudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vZGV2L2lzc3Vlci1yZWdpc3RyeS9zdWJvcmRpbmF0ZV9saXN0aW5nIn19LCJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJpc3N1ZXJyZWdpc3RyeS1rZXkxIiwieCI6IlJ6MU5ITUpfdEFaUVhzSk9ZcW5ZcnVHWWltRzZXTk9wME4yMzRFN3dxT3MiLCJ5IjoiSjVpQ0xiMlRfeXNDSHBqRnpjUjNpVy10dUR1WEVIbkpQdmZWTVFaT2Z6WSJ9XX0sImlzcyI6Imh0dHBzOi8vdzM0NDdrYTR2Zi5leGVjdXRlLWFwaS51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9kZXYvaXNzdWVyLXJlZ2lzdHJ5IiwiZXhwIjoxNzQyNDk0ODgxLCJpYXQiOjE3NDI0MDg0ODEsImp0aSI6IjQyZGU2MDJjNDVkZjFmMjQ5OGMwZjI2N2Q4ZDAwM2YyIn0.YTBuwYi2vP1ozuYB1aZyS7iO4215pqTS1cZDOFhQBTzF80wLzigvWL4_lI58_dzwVYNAHcv5pAQ77E_RfXILNA" };
    } else if (routeKey == `GET /${TRUST_ANCHOR_NAME}/fetch`) {
        const subValue = event.queryStringParameters?.sub || null;
        if (subValue =="did:web:oneuni.testuni.edu") {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: "eyJraWQiOiJpc3N1ZXJyZWdpc3RyeS1rZXkxIiwidHlwIjoiZW50aXR5LXN0YXRlbWVudCtqd3QiLCJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJkaWQ6d2ViOm9uZXVuaS50ZXN0dW5pLmVkdSIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiT25lVW5pIFVuaXZlcnNpdHkiLCJob21lcGFnZV91cmkiOiJodHRwczovL29uZXVuaS5lZHUiLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFCNFNVUkJWRWhMWTFEYTZFTlROR29CUVRScUFVRTBZaXh3a3EzWDV0TmdBQU5Ca1Jsb3N2Z1FFUmJNME9hQW1Bd0ZOTEZBa01OZFcyS0drd2pJRTFTM0FJRkdMU0NJUmkwZ2lFWXR3SUhxNVRrMEJDRUlhRHdJd0xoODlSaUtNUkJSRmtETnhRQlVzb0F5TkdvQlFUUnFBVUUwMUMzWTZBTUFzRHhKb3dYT3M2b0FBQUFBU1VWT1JLNUNZSUk9In19LCJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJvbmV1bmkta2V5MSIsIngiOiJ0Tm1yU0hNZ3FvdjRrSWtYZDBWcURXS1FhNHhvMm5yV3RVU2d0VWJEN29nIiwieSI6Imd4ZWE4bDVLWDhBajBHZm5COGhZS0I4WkVjVVljT1RnQURBVUF1STJVdjQifV19LCJpc3MiOiJodHRwczovL3czNDQ3a2E0dmYuZXhlY3V0ZS1hcGkudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vZGV2L2lzc3Vlci1yZWdpc3RyeSIsImV4cCI6MTc0MjQ5NTU2OCwiaWF0IjoxNzQyNDA5MTY4LCJqdGkiOiI1MjNhZTk5ZDYyMWEyMzVmNDhhY2QzYThkYTdhYmRhNiJ9.LJLK44npkkRI-wD-jIQDEJHnd-cnsdBwga12T4ILJJAD6-VHoTbbwg_wXPS4Uz_YF65o8Y-D8S-1X6sgUljVNg"
            };
        } else if (subValue == "did:web:twotr.testschool.edu") {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: "eyJraWQiOiJpc3N1ZXJyZWdpc3RyeS1rZXkxIiwidHlwIjoiZW50aXR5LXN0YXRlbWVudCtqd3QiLCJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJkaWQ6d2ViOnR3b3RyLnRlc3RzY2hvb2wuZWR1IiwibWV0YWRhdGEiOnsiZmVkZXJhdGlvbl9lbnRpdHkiOnsib3JnYW5pemF0aW9uX25hbWUiOiJUd29UcmFpbmluZyBOdXJzaW5nIFNjaG9vbCIsImhvbWVwYWdlX3VyaSI6Imh0dHBzOi8vdHdvdHJhaW5pbmcuY29tIiwibG9nb191cmkiOiJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUNBQUFBQWdDQUlBQUFEOEdPMmpBQUFBQVhOU1IwSUFyczRjNlFBQUFBUm5RVTFCQUFDeGp3djhZUVVBQUFBSmNFaFpjd0FBRW5RQUFCSjBBZDVtSDNnQUFBRXJTVVJCVkVoTFkzd3JvOEpBUzhBRXBXa0dSaTBnQ0VZdElBZ0dpUVYvdnM1NC84VGp5UjFoTVBKNDlXclBINmdNUVVBNEo5Ly84c1Rrd3c4STI1U040L1F2Q0p1alZVSW1nd1hNeEFzSSsrRHVieEJwS2lCNVJrWmxoNWpNV3huNWxkeEFnUi9WbjcrQ0pBZ0Jvc3FpKzM4WUZKRWQrK2VEeDRzM3A5bEV6b2dKS0VLRmNBS2k0Z0RGZEJJQldhbm96Ni9UVUJaaFFJNEZlNzUvQXBLbVhOd0V3d2NJU0xmZ3o0Y2VVT3p5bGZDd1FnVHdBeEl0K1BPMUNCaTlEQXp4SW1JdVVDRUNnQlFMUUlubitVSlFrcFh2NDRDS0VRVEVXbkQveHl0UTBtVGdpQmVSMzBGYzRFQUFFZmtBR0N6dm5pLzh4Y0RBeHRjcUpFWk03a1VHSkJVVkhLWnNZQm9HdExqRSt3ajVocVJJL2dFc2lKRFJOYWc0UGpEYWJDRUlSaTBnQ0VZdElBQVlHQUNkRFdoMzRTT3hrZ0FBQUFCSlJVNUVya0pnZ2c9PSJ9fSwiandrcyI6eyJrZXlzIjpbeyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoidHdvdHJhaW5pbmcta2V5MSIsIngiOiJrODJPYVh1Qm9vdjZ2ZDZSeUJGMmE4YmNfMXdEQVdobkFubUozbFRfdjRBIiwieSI6Ik1FZkYzYXd0RWE3VFNweXpfWHJfU1lyUUtvZE91RnAwRzZpVUZabW41UmsifV19LCJpc3MiOiJodHRwczovL3czNDQ3a2E0dmYuZXhlY3V0ZS1hcGkudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vZGV2L2lzc3Vlci1yZWdpc3RyeSIsImV4cCI6MTc0MjQ5NTU4NiwiaWF0IjoxNzQyNDA5MTg2LCJqdGkiOiJiN2Q3MjZlOTU0Y2MyMzE3YjJjYjA3Zjg2YjczYzgyZCJ9.G--7_h5_qeZe6wNm90TD8494HeO2hz8QBFBtWCmrVMzyuVK13px9k8CvrJ0vCG0IXJ7CnY-nS5H8kVaX_EmaIQ"
            };
        } else if (subValue == "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK") {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/entity-statement+jwt' },
                body: "eyJraWQiOiJpc3N1ZXJyZWdpc3RyeS1rZXkxIiwidHlwIjoiZW50aXR5LXN0YXRlbWVudCtqd3QiLCJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJkaWQ6a2V5Ono2TWtoYVhnQlpEdm90RGtMNTI1N2ZhaXp0aUdpQzJRdEtMR3Bibm5FR3RhMmRvSyIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiVGhyZWVUZWNoIENvbGxlZ2UiLCJob21lcGFnZV91cmkiOiJodHRwczovL3RocmVldGVjaC5jb20iLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFGZlNVUkJWRWhMWTV4NTh4VURMUUVUbEtZWkdMV0FJQmkxZ0NBWUtSWTh2SCtsenF0VFhTd2RnaUs4bGh5NkQ1VWlCSWl3NEZCSnA1djU1SlZuN2dIWmhpWktRUEw4bWNPcDVwMExpYktES0I4QWpWWUtYOTU4ODlYTUZkdktiNzVxcmpJQkNXN2ZSVXdwUm9RRmRqMHpkNTBzYjNJV2cvSVp4Qno4UWY0Z0RoQVhCL0tLVUFZRVBMd05DaTQxRmJpVmVBQnhGaUNEaDN1WHBDNWlZREFKUzNhR2l1QUZ4RnR3LzhxaG1YdnJ2TkxkSXA4YXh1WHUydVlzRDVYQUQ0aTI0TkRVeWFtMXExYWVBVEx2TVZ5NzhKRFlaRXBxalhiLzFjTjd1OG9qRDU5bllBaGZQck9KY0NpUkdnZUtZdkxPTVN1VzJ3S1pLM3YzUG9RSTRnT2tSeklJS0VrYVFsa0VBVEVXM0VjTnhQdFhGbWF2QWdZUmc1WTRFZkZNUkJ3Y0tra0hwMHNsc0t2dm5RZkZNeEFvVlowc2owZk5IOWdBWVIrOFlsQlZNZ1NXRFdlQVJvTk5COW9FVEtaRW1RNEVvKzBpZ21EVUFvSmdxRnZBd0FBQUJWcHhYMVBOSGFVQUFBQUFTVVZPUks1Q1lJST0ifX0sImp3a3MiOnsia2V5cyI6W3sia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6InRocmVldGVjaC1rZXkxIiwieCI6IlZuaWhzemxKdjFjVUZYVkhjdktIbWFnUTVmbU1GRGRudFNtYUJHSGFQMXMiLCJ5IjoiSG9aYTFSQml3ZFpyeW5SRGg3VXZWTDRHOElpdzYzTmpzanpNVDJSOGJ0ZyJ9XX0sImlzcyI6Imh0dHBzOi8vdzM0NDdrYTR2Zi5leGVjdXRlLWFwaS51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9kZXYvaXNzdWVyLXJlZ2lzdHJ5IiwiZXhwIjoxNzQyNDk1NjA2LCJpYXQiOjE3NDI0MDkyMDYsImp0aSI6ImY5OWRkZWRmNWE3NzAwMTMwMjdmY2Y5YmY0Y2I4ZDVmIn0.nNz-I20LrlbnM9w_di_Fynwc7EtJ_VnSWIsNWhZfrpljVuwlLCYSsoTtcDmwa4KdeoLDmsT96J2F-vVgzWMEUg"
            };
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
