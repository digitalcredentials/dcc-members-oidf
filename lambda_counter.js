const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const dynamoClient = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({ region: "us-east-1" });
const tableName = "db-visit-count";
const secretName = "test/test2";

exports.lambdaHandler = async (event, context) => {
    let body;
    let statusCode = 200;
    const headers = { "Content-Type": "application/json" };
    let visitCount = 0;

    try {
        const routeKey = event.routeKey;

        if (routeKey === "GET /items/{user}") {
            const user = event.pathParameters.user;

            // Get current visit count
            const response = await dynamoClient.send(new GetItemCommand({
                TableName: tableName,
                Key: { "user": { S: user } }
            }));

            // Extract count
            if (response.Item) {
                visitCount = parseInt(response.Item.count?.N || "0", 10);
            }

            // Increment count
            visitCount += 1;
            const message = `Visit count is ${visitCount}`;

            // Reconstruct Item
            const item = {
                "user": { S: user },
                "count": { N: visitCount.toString() }
            };

            // Write visit count back to DynamoDB
            await dynamoClient.send(new PutItemCommand({ TableName: tableName, Item: item }));

            body = JSON.stringify(message);
        } else if (routeKey === "GET /secret") {
            // Retrieve secret from AWS Secrets Manager
            const secretResponse = await secretsClient.send(new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT"
            }));

            body = secretResponse.SecretString;
        } else {
            throw new Error(`Unsupported route: ${routeKey}`);
        }
    } catch (error) {
        statusCode = 400;
        body = error.message;
    }

    return {
        statusCode,
        body,
        headers
    };
};
