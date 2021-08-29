const AWS = require('aws-sdk');
AWS.config.update({ region: 'eu-central-1' });

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const sqsURL = process.env.testSqsUrl || "https://sqs.eu-central-1.amazonaws.com/754190025304/Inventory.fifo";

module.exports = {
    queueMessage: async (message, messageGroupId ) => {
        await sqs.sendMessage({MessageBody: message, QueueUrl: sqsURL, MessageGroupId: messageGroupId, MessageDeduplicationId: Date.now()+""}).promise();
    } 
}