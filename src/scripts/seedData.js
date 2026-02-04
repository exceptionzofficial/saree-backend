require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize clients
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);

// Categories data
const categories = [
    { id: 'silk', name: 'Silk Sarees', slug: 'silk', image: 'https://nilormy.com/cdn/shop/files/RD_08167.png?v=1704447564', description: 'Luxurious pure silk sarees', order: 1 },
    { id: 'cotton', name: 'Cotton Sarees', slug: 'cotton', image: 'https://mysilklove.com/cdn/shop/files/MSLe1_2429ff66-94e6-4751-a09b-90ee5c6d49db.jpg?v=1684410227&width=2048', description: 'Comfortable everyday wear', order: 2 },
    { id: 'banarasi', name: 'Banarasi Sarees', slug: 'banarasi', image: 'https://jdinstituteoffashiontechnology.b-cdn.net/wp-content/uploads/2024/02/Banarasi-Sarees-A-Timeless-Treasure-of-Indian-Textile-3.jpg', description: 'Traditional handwoven elegance', order: 3 },
    { id: 'chiffon', name: 'Chiffon Sarees', slug: 'chiffon', image: 'https://medias.utsavfashion.com/media/catalog/product/cache/1/image/500x/040ec09b1e35df139433887a97daa66f/e/m/embroidered-chiffon-saree-in-blue-v1-spf12552.jpg', description: 'Light and flowy designs', order: 4 },
    { id: 'georgette', name: 'Georgette Sarees', slug: 'georgette', image: 'https://static.wixstatic.com/media/4594f8_ff7347cb7afc43cf909da1d7669e0f1c~mv2.jpg/v1/fill/w_480,h_644,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/4594f8_ff7347cb7afc43cf909da1d7669e0f1c~mv2.jpg', description: 'Modern party wear', order: 5 },
    { id: 'kanjivaram', name: 'Kanjivaram Sarees', slug: 'kanjivaram', image: 'https://assets2.andaazfashion.com/media/catalog/product/k/a/kanjivaram-silk-saree-in-navy-blue-color-sarv08832.jpg', description: 'South Indian heritage', order: 6 },
];

// Products data
const products = [
    {
        id: uuidv4(),
        name: 'Royal Magenta Kanjivaram Silk Saree',
        slug: 'royal-magenta-kanjivaram-silk',
        price: 12999,
        originalPrice: 15999,
        category: 'kanjivaram',
        material: 'Pure Silk',
        color: 'pink',
        weight: '750g',
        description: 'Exquisite pure Kanjivaram silk saree in royal magenta with intricate gold zari work. Traditional temple border with peacock motifs. Perfect for weddings and special occasions.',
        images: ['https://nilormy.com/cdn/shop/files/RD_08167.png?v=1704447564'],
        inStock: true,
        rating: 4.8,
        reviews: 124,
        featured: true,
        bestseller: true,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Elegant Navy Blue Banarasi Saree',
        slug: 'elegant-navy-blue-banarasi',
        price: 7499,
        originalPrice: 8999,
        category: 'banarasi',
        material: 'Banarasi Silk',
        color: 'blue',
        weight: '650g',
        description: 'Stunning navy blue Banarasi silk saree with silver zari work. Features classic Mughal-inspired patterns and rich pallu design.',
        images: ['https://5.imimg.com/data5/SELLER/Default/2023/9/347208068/IG/OT/JW/64087185/banarasi-saree-admiral-blue-banarasi-saree-silk-saree-online-30268511060161-500x500.jpg'],
        inStock: true,
        rating: 4.6,
        reviews: 89,
        featured: true,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Traditional Red Wedding Silk Saree',
        slug: 'traditional-red-wedding-silk',
        price: 15999,
        originalPrice: 18999,
        category: 'silk',
        material: 'Pure Silk',
        color: 'red',
        weight: '800g',
        description: 'Classic red bridal silk saree with heavy gold zari work. Traditional elephant and paisley motifs. The perfect choice for the big day.',
        images: ['https://ilovesarees.com/cdn/shop/files/Premium-Ox-Blood-Red-Banarasi-Silk-Saree-I-Love-Sarees6.webp?v=1727956714'],
        inStock: true,
        rating: 4.9,
        reviews: 256,
        featured: true,
        bestseller: true,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Soft Cotton Handloom Saree',
        slug: 'soft-cotton-handloom',
        price: 1999,
        originalPrice: 2499,
        category: 'cotton',
        material: 'Pure Cotton',
        color: 'white',
        weight: '400g',
        description: 'Comfortable off-white cotton handloom saree with subtle golden border. Perfect for daily wear and office occasions.',
        images: ['https://mysilklove.com/cdn/shop/files/MSLe1_2429ff66-94e6-4751-a09b-90ee5c6d49db.jpg?v=1684410227&width=800'],
        inStock: true,
        rating: 4.5,
        reviews: 312,
        featured: false,
        bestseller: true,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Emerald Green Chiffon Saree',
        slug: 'emerald-green-chiffon',
        price: 3299,
        originalPrice: 3999,
        category: 'chiffon',
        material: 'Pure Chiffon',
        color: 'green',
        weight: '350g',
        description: 'Elegant emerald green chiffon saree with delicate sequin work. Light and flowy, perfect for parties and evening events.',
        images: ['https://medias.utsavfashion.com/media/catalog/product/cache/1/image/500x/040ec09b1e35df139433887a97daa66f/e/m/embroidered-chiffon-saree-in-blue-v1-spf12552.jpg'],
        inStock: true,
        rating: 4.4,
        reviews: 78,
        featured: false,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Golden Beige Georgette Saree',
        slug: 'golden-beige-georgette',
        price: 3799,
        originalPrice: 4599,
        category: 'georgette',
        material: 'Georgette',
        color: 'beige',
        weight: '380g',
        description: 'Sophisticated golden beige georgette saree with intricate thread work. Modern design suitable for cocktail parties and receptions.',
        images: ['https://static.wixstatic.com/media/4594f8_ff7347cb7afc43cf909da1d7669e0f1c~mv2.jpg/v1/fill/w_480,h_644,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/4594f8_ff7347cb7afc43cf909da1d7669e0f1c~mv2.jpg'],
        inStock: true,
        rating: 4.7,
        reviews: 145,
        featured: true,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Purple Mysore Silk Saree',
        slug: 'purple-mysore-silk',
        price: 5999,
        originalPrice: 6999,
        category: 'silk',
        material: 'Mysore Silk',
        color: 'purple',
        weight: '550g',
        description: 'Rich purple Mysore silk saree with traditional gold kasuti work. Perfect blend of elegance and tradition.',
        images: ['https://assets2.andaazfashion.com/media/catalog/product/k/a/kanjivaram-silk-saree-in-navy-blue-color-sarv08832.jpg'],
        inStock: true,
        rating: 4.6,
        reviews: 92,
        featured: false,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Peach Pink Designer Saree',
        slug: 'peach-pink-designer',
        price: 4499,
        originalPrice: 5499,
        category: 'georgette',
        material: 'Net Georgette',
        color: 'pink',
        weight: '420g',
        description: 'Trendy peach pink designer saree with heavy stone and pearl work. Perfect for sangeet and engagement ceremonies.',
        images: ['https://www.shopethnos.com/cdn/shop/products/8206.jpg?v=1742859363'],
        inStock: true,
        rating: 4.8,
        reviews: 167,
        featured: true,
        bestseller: true,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Black Gold Kanjivaram Saree',
        slug: 'black-gold-kanjivaram',
        price: 12499,
        originalPrice: 14999,
        category: 'kanjivaram',
        material: 'Pure Silk',
        color: 'black',
        weight: '720g',
        description: 'Striking black Kanjivaram silk saree with heavy gold zari border. Bold and elegant choice for evening functions.',
        images: ['https://priyangaa.in/cdn/shop/files/jpeg-optimizer_149a-min.jpg?v=1733118665'],
        inStock: true,
        rating: 4.7,
        reviews: 108,
        featured: false,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Sunshine Yellow Cotton Saree',
        slug: 'sunshine-yellow-cotton',
        price: 2499,
        originalPrice: 2999,
        category: 'cotton',
        material: 'Handloom Cotton',
        color: 'yellow',
        weight: '420g',
        description: 'Bright and cheerful yellow cotton saree with red border. Perfect for pujas and festive occasions.',
        images: ['https://www.kollybollyethnics.com/image/catalog/data/09Mar2019/Ashra-Sunshine-Yellow-Cotton-Saree-350.jpg'],
        inStock: true,
        rating: 4.5,
        reviews: 198,
        featured: false,
        bestseller: true,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Maroon Tussar Silk Saree',
        slug: 'maroon-tussar-silk',
        price: 6499,
        originalPrice: 7999,
        category: 'silk',
        material: 'Tussar Silk',
        color: 'maroon',
        weight: '480g',
        description: 'Beautiful maroon Tussar silk saree with hand-painted madhubani art. A unique piece showcasing traditional folk art.',
        images: ['https://mysilklove.com/cdn/shop/files/msl-f1_a9d38c6f-3aa2-4b5c-b120-3e6eeb82d041.jpg?v=1705563737&width=2048'],
        inStock: true,
        rating: 4.9,
        reviews: 76,
        featured: true,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Orange Bandhani Saree',
        slug: 'orange-bandhani',
        price: 2999,
        originalPrice: 3499,
        category: 'cotton',
        material: 'Cotton Silk',
        color: 'orange',
        weight: '450g',
        description: 'Vibrant orange Bandhani saree from Gujarat. Traditional tie-dye technique creating beautiful patterns.',
        images: ['https://5.imimg.com/data5/ECOM/Default/2023/8/336965913/DP/GQ/OQ/152203226/vdbaraatioranges.jpg'],
        inStock: true,
        rating: 4.4,
        reviews: 134,
        featured: false,
        bestseller: false,
        blouseIncluded: true,
        createdAt: new Date().toISOString()
    }
];

// Check if table exists
async function tableExists(tableName) {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (error) {
        return false;
    }
}

// Create table if not exists
async function ensureTable(tableName) {
    const exists = await tableExists(tableName);
    if (!exists) {
        console.log(`Creating table ${tableName}...`);
        await client.send(new CreateTableCommand({
            TableName: tableName,
            KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
            BillingMode: 'PAY_PER_REQUEST'
        }));
        // Wait for table to be active
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Check if table is empty
async function isTableEmpty(tableName) {
    try {
        const result = await docClient.send(new ScanCommand({
            TableName: tableName,
            Limit: 1
        }));
        return !result.Items || result.Items.length === 0;
    } catch {
        return true;
    }
}

// Seed data
async function seedData() {
    console.log('========================================');
    console.log('  Seeding Initial Data');
    console.log('========================================\n');

    // Ensure tables exist
    await ensureTable('Saree_Categories');
    await ensureTable('Saree_Products');

    // Seed categories
    const categoriesEmpty = await isTableEmpty('Saree_Categories');
    if (categoriesEmpty) {
        console.log('📁 Seeding categories...');
        for (const category of categories) {
            await docClient.send(new PutCommand({
                TableName: 'Saree_Categories',
                Item: { ...category, createdAt: new Date().toISOString() }
            }));
            console.log(`  ✅ Added category: ${category.name}`);
        }
    } else {
        console.log('📁 Categories already exist, skipping...');
    }

    // Seed products
    const productsEmpty = await isTableEmpty('Saree_Products');
    if (productsEmpty) {
        console.log('\n📦 Seeding products...');
        for (const product of products) {
            await docClient.send(new PutCommand({
                TableName: 'Saree_Products',
                Item: product
            }));
            console.log(`  ✅ Added product: ${product.name}`);
        }
    } else {
        console.log('\n📦 Products already exist, skipping...');
    }

    console.log('\n========================================');
    console.log('  Seeding Complete!');
    console.log('========================================');
}

seedData().catch(console.error);
