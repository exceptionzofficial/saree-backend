const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB Client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Document Client for easier JSON handling
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

// Table Names
const TABLES = {
    PRODUCTS: 'Saree_Products',
    ORDERS: 'Saree_Orders',
    USERS: 'Saree_Users',
    MEMBERSHIPS: 'Saree_Memberships',
    MEMBERSHIP_REQUESTS: 'Saree_MembershipRequests',
    REWARD_CLAIMS: 'Saree_RewardClaims',
    SETTINGS: 'Saree_Settings'
};

// Generic Operations
const getItem = async (tableName, key) => {
    const command = new GetCommand({
        TableName: tableName,
        Key: key
    });
    const response = await docClient.send(command);
    return response.Item;
};

const putItem = async (tableName, item) => {
    const command = new PutCommand({
        TableName: tableName,
        Item: item
    });
    await docClient.send(command);
    return item;
};

const scanTable = async (tableName) => {
    const command = new ScanCommand({
        TableName: tableName
    });
    const response = await docClient.send(command);
    return response.Items || [];
};

const queryItems = async (tableName, keyCondition, expressionValues) => {
    const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues
    });
    const response = await docClient.send(command);
    return response.Items || [];
};

const updateItem = async (tableName, key, updateExpression, expressionValues) => {
    const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW'
    });
    const response = await docClient.send(command);
    return response.Attributes;
};

const deleteItem = async (tableName, key) => {
    const command = new DeleteCommand({
        TableName: tableName,
        Key: key
    });
    await docClient.send(command);
    return true;
};

module.exports = {
    client,
    docClient,
    TABLES,
    getItem,
    putItem,
    scanTable,
    queryItems,
    updateItem,
    deleteItem
};
