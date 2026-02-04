require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, CreateBucketCommand, PutBucketCorsCommand, HeadBucketCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

// Initialize clients
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Table definitions
const tables = [
    {
        TableName: 'Saree_Products',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_Categories',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_Orders',
        KeySchema: [
            { AttributeName: 'orderId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'orderId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_Memberships',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'email', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_MembershipRequests',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_Settings',
        KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    },
    {
        TableName: 'Saree_Users',
        KeySchema: [{ AttributeName: 'mobile', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'mobile', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
    }
];

// Check if table exists
async function tableExists(tableName) {
    try {
        await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            return false;
        }
        throw error;
    }
}

// Create DynamoDB tables
async function createTables() {
    console.log('🚀 Creating DynamoDB tables...\n');

    for (const table of tables) {
        try {
            const exists = await tableExists(table.TableName);
            if (exists) {
                console.log(`✅ Table ${table.TableName} already exists`);
                continue;
            }

            await dynamoClient.send(new CreateTableCommand(table));
            console.log(`✅ Created table: ${table.TableName}`);
        } catch (error) {
            console.error(`❌ Error creating table ${table.TableName}:`, error.message);
        }
    }
}

// Check if bucket exists
async function bucketExists() {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        return true;
    } catch (error) {
        return false;
    }
}

// Create S3 bucket with public read access for images
async function createS3Bucket() {
    console.log('\n🚀 Creating S3 bucket...\n');

    try {
        const exists = await bucketExists();
        if (exists) {
            console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
            return;
        }

        // Create bucket
        await s3Client.send(new CreateBucketCommand({
            Bucket: BUCKET_NAME,
            CreateBucketConfiguration: {
                LocationConstraint: process.env.AWS_REGION
            }
        }));
        console.log(`✅ Created bucket: ${BUCKET_NAME}`);

        // Disable block public access for bucket policy
        await s3Client.send(new PutPublicAccessBlockCommand({
            Bucket: BUCKET_NAME,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
            }
        }));
        console.log(`✅ Disabled public access block for ${BUCKET_NAME}`);

        // Set bucket policy for public read
        const bucketPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'PublicReadGetObject',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
                }
            ]
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(bucketPolicy)
        }));
        console.log(`✅ Set public read policy for ${BUCKET_NAME}`);

        // Set CORS for frontend access
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        }));
        console.log(`✅ Set CORS configuration for ${BUCKET_NAME}`);

    } catch (error) {
        console.error(`❌ Error creating bucket:`, error.message);
    }
}

// Main function
async function main() {
    console.log('========================================');
    console.log('  AWS Setup Script for Saree Ecommerce');
    console.log('========================================\n');
    console.log(`Region: ${process.env.AWS_REGION}`);
    console.log(`Bucket: ${BUCKET_NAME}\n`);

    await createTables();
    await createS3Bucket();

    console.log('\n========================================');
    console.log('  Setup Complete!');
    console.log('========================================');
}

main().catch(console.error);
