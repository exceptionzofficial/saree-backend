const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const STORE_NAME = process.env.STORE_NAME || 'Gurubagavan Sarees';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// Base email template
const getEmailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; }
        .header h1 { color: #c9a227; margin: 0; font-size: 24px; }
        .header p { color: #ffffff; margin: 8px 0 0; font-size: 14px; }
        .content { padding: 30px; }
        .content h2 { color: #1e3a5f; margin-top: 0; }
        .info-box { background: #f8f9fa; border-left: 4px solid #c9a227; padding: 15px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .info-label { color: #666; font-size: 14px; }
        .info-value { color: #333; font-weight: 600; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #1e3a5f; }
        .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; font-size: 18px; color: #1e3a5f; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-confirmed { background: #d4edda; color: #155724; }
        .status-shipped { background: #cce5ff; color: #004085; }
        .status-delivered { background: #d4edda; color: #155724; }
        .btn { display: inline-block; padding: 12px 30px; background: #c9a227; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; }
        .footer { background: #1e3a5f; padding: 20px; text-align: center; color: #ffffff; font-size: 12px; }
        .footer a { color: #c9a227; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${STORE_NAME}</h1>
            <p>Premium Silk Sarees Collection</p>
        </div>
        <div class="content">
            <h2>${title}</h2>
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
            <p>Questions? Contact us at <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
    </div>
</body>
</html>
`;

// Format currency
const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// ==================== ORDER EMAILS ====================

// Send order confirmation to customer
const sendOrderConfirmation = async (order) => {
    try {
        const itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const content = `
            <p>Thank you for your order! We have received your order and it is being processed.</p>
            
            <div class="info-box">
                <strong>Order ID:</strong> ${order.orderId}<br>
                <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </div>

            <h3>Order Items</h3>
            <table class="items-table">
                <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
                ${itemsHtml}
                <tr class="total-row">
                    <td colspan="3">Grand Total</td>
                    <td>${formatCurrency(order.total)}</td>
                </tr>
            </table>

            <h3>Shipping Address</h3>
            <div class="info-box">
                <strong>${order.customer.name}</strong><br>
                ${order.customer.address}<br>
                ${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}<br>
                Phone: ${order.customer.phone}
            </div>

            <p>We will notify you once your order is shipped. You can track your order status using the order ID above.</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: order.customer.email,
            subject: `Order Confirmed - ${order.orderId}`,
            html: getEmailTemplate('Order Confirmation', content)
        });

        console.log(`Order confirmation email sent to ${order.customer.email}`);
    } catch (error) {
        console.error('Error sending order confirmation email:', error.message);
    }
};

// Send new order notification to admin
const sendNewOrderNotification = async (order) => {
    try {
        const itemsList = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');

        const content = `
            <p>A new order has been placed on your store!</p>
            
            <div class="info-box">
                <strong>Order ID:</strong> ${order.orderId}<br>
                <strong>Customer:</strong> ${order.customer.name}<br>
                <strong>Phone:</strong> ${order.customer.phone}<br>
                <strong>Email:</strong> ${order.customer.email}<br>
                <strong>Total:</strong> ${formatCurrency(order.total)}
            </div>

            <h3>Items Ordered</h3>
            <p>${itemsList}</p>

            <h3>Shipping Address</h3>
            <div class="info-box">
                ${order.customer.address}<br>
                ${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}
            </div>

            <p>Please log in to the admin panel to process this order.</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            subject: `🛒 New Order Received - ${order.orderId}`,
            html: getEmailTemplate('New Order Alert', content)
        });

        console.log('New order notification sent to admin');
    } catch (error) {
        console.error('Error sending new order notification:', error.message);
    }
};

// Send order status update to customer
const sendOrderStatusUpdate = async (order) => {
    try {
        const statusMessages = {
            pending: 'Your order is being reviewed.',
            confirmed: 'Your order has been confirmed and is being prepared.',
            shipped: 'Great news! Your order has been shipped and is on its way.',
            delivered: 'Your order has been delivered. We hope you love your purchase!',
            cancelled: 'Your order has been cancelled.'
        };

        const statusClass = `status-${order.status}`;
        const statusMessage = statusMessages[order.status] || 'Your order status has been updated.';

        const content = `
            <p>${statusMessage}</p>
            
            <div class="info-box">
                <strong>Order ID:</strong> ${order.orderId}<br>
                <strong>Status:</strong> <span class="status-badge ${statusClass}">${order.status.toUpperCase()}</span>
            </div>

            <h3>Order Summary</h3>
            <p><strong>Total:</strong> ${formatCurrency(order.total)}</p>
            <p><strong>Items:</strong> ${order.items.map(i => i.name).join(', ')}</p>

            ${order.status === 'shipped' ? '<p>You can expect delivery within 3-5 business days.</p>' : ''}
            
            <p>Thank you for shopping with us!</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: order.customer.email,
            subject: `Order Update - ${order.status.toUpperCase()} - ${order.orderId}`,
            html: getEmailTemplate('Order Status Update', content)
        });

        console.log(`Order status update email sent to ${order.customer.email}`);
    } catch (error) {
        console.error('Error sending order status update email:', error.message);
    }
};

// ==================== MEMBERSHIP EMAILS ====================

// Send membership request notification to admin
const sendMembershipRequestNotification = async (request) => {
    try {
        const content = `
            <p>A new membership request has been submitted!</p>
            
            <div class="info-box">
                <strong>Name:</strong> ${request.name}<br>
                <strong>Email:</strong> ${request.email}<br>
                <strong>Mobile:</strong> ${request.mobile}<br>
                <strong>Submitted:</strong> ${new Date(request.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </div>

            ${request.referralCode ? `<p><strong>Referral Code Used:</strong> ${request.referralCode}</p>` : ''}

            <p>Please review the payment screenshot and approve or reject this request from the admin panel.</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            subject: `👤 New Membership Request - ${request.name}`,
            html: getEmailTemplate('New Membership Request', content)
        });

        console.log('Membership request notification sent to admin');
    } catch (error) {
        console.error('Error sending membership request notification:', error.message);
    }
};

// Send membership approval notification to customer
const sendMembershipApprovalNotification = async (membership) => {
    try {
        const content = `
            <p>Congratulations! Your Premium Membership has been approved! 🎉</p>
            
            <div class="info-box">
                <strong>Your Referral Code:</strong> <span style="font-size: 20px; color: #c9a227; font-weight: bold;">${membership.referralCode}</span>
            </div>

            <h3>What's Next?</h3>
            <ul>
                <li>Share your referral code with friends and family</li>
                <li>Get <strong>100% Money Back</strong> after 5 successful referrals</li>
                <li>Earn a <strong>Pure Gold Coin</strong> after 7 successful referrals</li>
            </ul>

            <p>Log in to your Seller Dashboard to track your referrals and rewards!</p>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="#" class="btn">Go to Dashboard</a>
            </p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: membership.email,
            subject: `🎉 Membership Approved - Welcome to ${STORE_NAME}!`,
            html: getEmailTemplate('Membership Approved!', content)
        });

        console.log(`Membership approval email sent to ${membership.email}`);
    } catch (error) {
        console.error('Error sending membership approval email:', error.message);
    }
};

// ==================== REWARD CLAIM EMAILS ====================

// Send reward claim notification to admin
const sendRewardClaimNotification = async (claim, membership) => {
    try {
        const claimType = claim.type === 'cashback' ? 'Cashback (Money Back)' : 'Gold Coin';

        let paymentDetails = '';
        if (claim.type === 'cashback') {
            paymentDetails = `
                <h3>Payment Details</h3>
                <div class="info-box">
                    <strong>UPI ID:</strong> ${claim.upiId || 'N/A'}<br>
                    <strong>Bank Name:</strong> ${claim.bankName || 'N/A'}<br>
                    <strong>Account Number:</strong> ${claim.accountNumber || 'N/A'}<br>
                    <strong>IFSC Code:</strong> ${claim.ifscCode || 'N/A'}
                </div>
            `;
        } else {
            paymentDetails = `
                <h3>Shipping Address</h3>
                <div class="info-box">
                    ${claim.address}<br>
                    Postal Code: ${claim.postalCode}
                </div>
            `;
        }

        const content = `
            <p>A member has submitted a reward claim!</p>
            
            <div class="info-box">
                <strong>Claim Type:</strong> ${claimType}<br>
                <strong>Member Name:</strong> ${claim.name}<br>
                <strong>Email:</strong> ${claim.email}<br>
                <strong>Phone:</strong> ${claim.phone}<br>
                <strong>Referral Count:</strong> ${membership?.referralCount || 'N/A'}
            </div>

            ${paymentDetails}

            <p>Please process this claim from the Reward Claims section in the admin panel.</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            subject: `🎁 New ${claimType} Claim - ${claim.name}`,
            html: getEmailTemplate(`New ${claimType} Claim`, content)
        });

        console.log('Reward claim notification sent to admin');
    } catch (error) {
        console.error('Error sending reward claim notification:', error.message);
    }
};

// ==================== CONTACT FORM EMAIL ====================

// Send contact form notification to admin
const sendContactFormNotification = async ({ name, email, phone, subject, message }) => {
    try {
        const subjectLabels = {
            product: 'Product Inquiry',
            order: 'Order Related',
            return: 'Returns & Refunds',
            feedback: 'Feedback',
            other: 'Other'
        };

        const content = `
            <p>You have received a new message from the Contact Us form on your website.</p>
            
            <div class="info-box">
                <strong>Name:</strong> ${name}<br>
                <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br>
                <strong>Phone:</strong> <a href="tel:${phone}">${phone}</a><br>
                <strong>Subject:</strong> ${subjectLabels[subject] || subject}<br>
                <strong>Date:</strong> ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
            </div>

            <h3>Message</h3>
            <div class="info-box" style="white-space: pre-wrap;">
                ${message}
            </div>

            <p>You can reply directly to this email to respond to the customer.</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            replyTo: email,
            subject: `📩 New Contact Message - ${subjectLabels[subject] || subject} from ${name}`,
            html: getEmailTemplate('New Contact Form Message', content)
        });

        console.log(`Contact form notification sent to admin from ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending contact form notification:', error.message);
        throw error;
    }
};

// Send reward claim status update to customer
const sendRewardClaimStatusUpdate = async (claim, status) => {
    try {
        const claimType = claim.type === 'cashback' ? 'Cashback' : 'Gold Coin';

        let statusMessage = '';
        let title = '';

        if (status === 'in_progress') {
            title = 'Claim In Progress';
            statusMessage = `Your ${claimType} claim is now being processed. We will update you once it's completed.`;
        } else if (status === 'completed') {
            title = 'Claim Completed! 🎉';
            if (claim.type === 'cashback') {
                statusMessage = 'Great news! Your cashback has been processed and the amount has been transferred to your account.';
            } else {
                statusMessage = 'Great news! Your Gold Coin has been dispatched and will be delivered to your address soon.';
            }
        }

        const content = `
            <p>${statusMessage}</p>
            
            <div class="info-box">
                <strong>Claim Type:</strong> ${claimType}<br>
                <strong>Status:</strong> <span class="status-badge status-${status === 'completed' ? 'delivered' : 'shipped'}">${status.toUpperCase().replace('_', ' ')}</span>
            </div>

            <p>Thank you for being a valued member of ${STORE_NAME}!</p>
        `;

        await transporter.sendMail({
            from: `"${STORE_NAME}" <${process.env.EMAIL_USER}>`,
            to: claim.email,
            subject: `${claimType} Claim Update - ${title}`,
            html: getEmailTemplate(title, content)
        });

        console.log(`Reward claim status update sent to ${claim.email}`);
    } catch (error) {
        console.error('Error sending reward claim status update:', error.message);
    }
};

module.exports = {
    sendOrderConfirmation,
    sendNewOrderNotification,
    sendOrderStatusUpdate,
    sendMembershipRequestNotification,
    sendMembershipApprovalNotification,
    sendRewardClaimNotification,
    sendRewardClaimStatusUpdate,
    sendContactFormNotification
};
