const AWS = require('aws-sdk');
const os = require('os');
AWS.config.update({ region: 'eu-central-1' });

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const prefixFileName = (date) => date.toDateString().replace(/\s+/g, "-");
const fileName = () => prefixFileName(new Date()) + ".txt";

const bucketName = process.env.testBucket || "loginventory";

module.exports = {
    logInventoryAction: async (message) => {
        const fileContent = await getCurrentLogFileContent();
        await s3.upload({ Bucket: bucketName, Key: fileName(), Body: `${fileContent}${message}` }).promise();
    } 
}

async function getCurrentLogFileContent() {

    if (await hasCurrentLogFile()) {
        const { Body } = await s3.getObject({ Bucket: bucketName, Key: fileName() }).promise();
        return Buffer.from(Body).toString() + os.EOL;
    }

    return "";
}

async function hasCurrentLogFile() {

    const { Contents } = await s3.listObjectsV2({ Bucket: bucketName, MaxKeys: 1, Prefix: prefixFileName(new Date()) }).promise();

    return Contents.length > 0;
}