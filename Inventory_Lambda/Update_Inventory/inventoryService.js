const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});

const tableName = process.env.testDynamoTable || "Inventory";

var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

module.exports = {
    updateInventory: async (productName, action) => {
        amount = 0;
        const { Item } = await ddb.getItem(createGetItemDBObject(productName)).promise();
        if(Item) {
            amount = Item.quantity.N;
        }
    
        const updatedAmount = parseInt(amount) + parseInt(action);

        await ddb.putItem(createPutItemDBObject(productName,  updatedAmount)).promise();
    }
}

function createGetItemDBObject(productName) {
    return {
        TableName: tableName,
        Key: {
            'Products': { S: productName }
        },
    };
}

function createPutItemDBObject(productName, quantity) {
    return {
        TableName: tableName,
        Item: {
            "Products": {
                S: productName
            },
            "quantity": {
                N: quantity + ""
            },
        },
    };
}