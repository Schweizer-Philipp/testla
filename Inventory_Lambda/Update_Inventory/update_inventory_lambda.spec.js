const { describe, it, lambda, after, before, beforeEach, afterEach } = require("@ps/testla/dist/test");
const { s3Bucket } = require("@ps/testla/dist/s3/s3TestFunction");
const { dynamoDb } = require("@ps/testla/dist/dynamo/dynamoTestFunction");
const { sqs } = require("@ps/testla/dist/sqs/sqsTestFunction");

const prefixFileName = (date) => date.toDateString().replace(/\s+/g, "-");
const fileName = () => prefixFileName(new Date()) + ".txt";

module.exports = describe("Update inventory lambda ", async () => {
    await it("should return 404 when body is wrong", async () => {
        (await lambda("inventory-Lambda", { "body": "{\"action\": \"20\",\"user\": \"Philipp\"}" }, undefined).execute()).hasReturnValue(400);
        (await s3Bucket(process.env.testBucket).file(fileName(), false)).exists();
        (await s3Bucket(process.env.testBucket).fileContent(fileName(), "The request did not have the right parameters")).equals();
        (await dynamoDb(process.env.testDynamoTable).table()).exists();
        (await sqs(process.env.testSqsUrl).message()).notExists();
    });
    await it("should return 200 when body is correct and should create file", async () => {
        (await lambda("inventory-Lambda", { "body": "{\"product\": \"table\",\"action\": \"20\",\"user\": \"Philipp\"}" }, undefined).execute()).hasReturnValue(200);
        (await s3Bucket(process.env.testBucket).fileContent(fileName(), "The user Philipp has changed table with the action 20")).equals();
        (await dynamoDb(process.env.testDynamoTable).table()).exists();
        (await dynamoDb(process.env.testDynamoTable).tableContent({ "Products": { "S": "table" } }, { "Products": "table", "quantity": "20" })).equals();
        (
          await sqs(process.env.testSqsUrl).messageContent({
            body: "The user Philipp has changed table with the action 20",
            messageGroupId: "inventory",
          })
        ).equals();
    });
});


