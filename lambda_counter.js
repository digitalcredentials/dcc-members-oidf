const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({});
const tableName = "db-visit-count";

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
            const response = await client.send(new GetItemCommand({
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
            await client.send(new PutItemCommand({ TableName: tableName, Item: item }));

            body = message;
        } else {
            throw new Error(`Unsupported route: ${routeKey}`);
        }
    } catch (error) {
        statusCode = 400;
        body = error.message;
    }

    return {
        statusCode,
        body: JSON.stringify(body),
        headers
    };
};
