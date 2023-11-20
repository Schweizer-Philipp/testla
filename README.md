# Testla

Testla is a testing framework specifically designed for integration testing of AWS Lambda functions. The framework enables automated execution of Lambda functions and validation of resulting state changes.
In the 'Inventory_Lambda' folder, there is a sample Lambda function written along with its corresponding example test file.

## Features

- Automated execution of AWS Lambda functions
- Verification of state changes in conjunction with AWS services such as S3 Bucket, DynamoDB, and SQS
- User-friendly configuration through a configuration file

## Prerequisite

In order for Testla to be utilized, service names in the Lambda function being tested must be accessible through environment variables. An example for a DynamoDB service would be:

```ts
const tableName = process.env.testDynamoTable || "Inventory";
```

## Configuration options

If no name is provided, a random name will be generated for the service. 

| Option              | Description                                                                                                       |
|---------------------|-------------------------------------------------------------------------------------------------------------------|
| testDirectory       | An array of directories where test files are located.                                                             |
| testFiles           | Glob pattern for identifying test files.                                                                          |
| s3Buckets           | An array of S3 buckets configurations.                                                                            |
| lambdas             | A collection of Lambda function configurations.                                                                   |
| dynamoDbs           | An array of DynamoDB table configurations.                                                                        |
| sqsQeueus           | An array of SQS queue configurations.                                                                             |

### S3 Bucket configuration

| Field              | Description                                        |
|-------------------|-----------------------------------------------------|
| bucketName        | Name of the S3 bucket.                              |
| enviromentName    | Name of the environment variable for the S3 bucket. |
| region            | AWS region of the bucket.                           |

### Lambda configuration

| Field      | Description                              |
|------------|------------------------------------------|
| path       | Path to the Lambda function code.        |
| handler    | Optional. Lambda function handler.       |

### DynamoDB configuration

| Field            | Description                                             |
|-----------------|----------------------------------------------------------|
| tableName       | Name of the DynamoDB table.                              |
| enviromentName  | Name of the environment variable for the DynamoDB table. |
| properties      | Array of attributes with AttributeName and AttributeType.|
| keys            | Array of key attributes with AttributeName and KeyType.  |

### SQS queue configuration

| Field          | Description                                         |
|----------------|-----------------------------------------------------|
| sqsName        | Name of the SQS queue.                              |
| enviromentName | Name of the environment variable for the SQS queue. |
| fifo           | Boolean indicating if the queue is FIFO.            |

## Usage

```ts
const { describe, it, lambda, after, before, beforeEach, afterEach } = require("@ps/testla/dist/test");
const { s3Bucket } = require("@ps/testla/dist/s3/s3TestFunction");
const { dynamoDb } = require("@ps/testla/dist/dynamo/dynamoTestFunction");
const { sqs } = require("@ps/testla/dist/sqs/sqsTestFunction");
```

### Configuration
Example Configuration

```json
{
    "testDirectory": [
        "Update_Inventory/test/"
    ],
    "testFiles": "spec",
    "lambdas": {
        "inventory-Lambda": {
            "path": "Update_Inventory/update_inventory.js"
        }
    },
    "s3Buckets": [
        {
            "enviromentName": "testBucket"
        }
    ],
    "dynamoDbs": [
        {
            "enviromentName": "testDynamoTable",
            "properties": [{
                "AttributeName": "Products",
                "AttributeType": "S"
            }],
            "keys": [{
                "AttributeName": "Products",
                "KeyType": "HASH"
            }]
        }
    ],
    "sqsQeueus" : [
        {
            "enviromentName": "testSqsUrl",
            "fifo": true
        }
    ]
}
```

### Test functions

To create a new test case, the `describe` function is used. It must be exported as shown in the following example.

```ts
module.exports = describe("Update inventory lambda ", async () => {
    /** Here tests can be defined */
});
```

To define a test, the `it` function is ultimately used. In it, the Lambda function must be executed first.

```ts
await it("should return 404 when body is wrong", async () => {
        (await lambda("inventory-Lambda", { "body": "{\"action\": \"20\",\"user\": \"Philipp\"}" }, undefined)
            .execute()).hasReturnValue(400);
});
```

After the Lambda has been executed, the services can be selected via environment variables, and their states can be tested.

`S3`

```ts
(await s3Bucket(process.env.testBucket).file(fileName(), false)).exists();
(await s3Bucket(process.env.testBucket).fileContent(fileName(), "The request did not have the right parameters")).equals();
```

`DynamoDB`

```ts
(await dynamoDb(process.env.testDynamoTable).table()).exists();
```

`SQS`

```ts
(await sqs(process.env.testSqsUrl).message()).notExists();
```

### Complete example of use

```ts
module.exports = describe("Update inventory lambda ", async () => {
    await it("should return 404 when body is wrong", async () => {
        (await lambda("inventory-Lambda", { "body": "{\"action\": \"20\",\"user\": \"Philipp\"}" }, undefined)
            .execute()).hasReturnValue(400);

        (await s3Bucket(process.env.testBucket).file(fileName(), false)).exists();

        (await s3Bucket(process.env.testBucket).fileContent(fileName(), "The request did not have the right parameters"))
            .equals();

        (await dynamoDb(process.env.testDynamoTable).table()).exists();

        (await sqs(process.env.testSqsUrl).message()).notExists();
    });
    await it("should return 200 when body is correct and should create file", async () => {
        (await lambda("inventory-Lambda", { "body": "{\"product\": \"table\",\"action\": \"20\",\"user\": \"Philipp\"}" }, undefined)
            .execute()).hasReturnValue(200);

        (await s3Bucket(process.env.testBucket).fileContent(fileName(), "The user Philipp has changed table with the action 20"))
            .equals();

        (await dynamoDb(process.env.testDynamoTable).table()).exists();

        (await dynamoDb(process.env.testDynamoTable).tableContent({ "Products": { "S": "table" } }, { "Products": "table", "quantity": "20" }))
            .equals();

        (
          await sqs(process.env.testSqsUrl).messageContent({
            body: "The user Philipp has changed table with the action 20",
            messageGroupId: "inventory",
          })
        ).equals();
    });
});
```


       
        