const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Upload image to S3
const uploadImage = async (fileBuffer, fileName, mimeType) => {
    const uniqueFileName = `products/${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueFileName,
        Body: fileBuffer,
        ContentType: mimeType
    });

    await s3Client.send(command);

    // Return the public URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
};

// Get signed URL for private access (if needed)
const getSignedImageUrl = async (key, expiresIn = 3600) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
};

// Delete image from S3
const deleteImage = async (imageUrl) => {
    // Extract key from URL
    const key = imageUrl.split('.amazonaws.com/')[1];

    if (!key) return false;

    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    await s3Client.send(command);
    return true;
};

module.exports = {
    s3Client,
    BUCKET_NAME,
    uploadImage,
    getSignedImageUrl,
    deleteImage
};
