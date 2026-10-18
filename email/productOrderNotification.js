const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const productOrderNotification = (data) => {
    const isSeller = data.recipient === 'seller'
    const isApproved = data.status === 'confirmed'
    const isRejected = data.status === 'rejected'
    const statusMessages = {
        accepted: 'The seller has accepted your order.',
        preparing: 'The seller is preparing your order.',
        ready_to_ship: 'Your order is ready to ship.',
        shipped: 'Your order has been marked as shipped.',
        fulfilled: 'Your order has been marked as delivered.',
    }
    const statusMessage = statusMessages[data.status]
    const title = isSeller ? 'A new order is ready for you'
        : isApproved ? 'Your order is confirmed'
            : isRejected ? 'Your order was not approved'
                : statusMessage ? `Order ${data.status}`
                    : 'We received your order'
    const items = data.items.map((item) => `
        <tr>
            <td>${escapeHtml(item.productName)}${item.variantName ? `<br><span style="color:#666">${escapeHtml(item.variantName)}</span>` : ''}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${escapeHtml(item.lineTotalFormatted)}</td>
        </tr>
    `).join('')

    return `
        <!doctype html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
        <body style="margin:0;padding:24px;background:#f7f7f7;font-family:Arial,sans-serif;color:#222">
            <main style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:28px">
                <p style="margin-top:0;color:#9b174c;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Eventsora Shop</p>
                <h1 style="font-size:24px">${escapeHtml(title)}</h1>
                <p>Hello ${escapeHtml(data.recipientName)},</p>
                <p>${isSeller ? 'The Eventsora team has reviewed the order and assigned it to you for fulfillment.' : isApproved ? 'Your payment has been verified by our team and the order has been sent to the seller.' : isRejected ? 'Our team or the seller could not approve this order. Please contact Eventsora support if you need more information.' : statusMessage || 'Our team will review your order and payment before sending it to the seller.'}</p>
                <p><strong>Order number:</strong> ${escapeHtml(data.orderNumber)}</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0">
                    <thead><tr><th style="padding:10px;border-bottom:1px solid #ddd;text-align:left">Product</th><th style="padding:10px;border-bottom:1px solid #ddd">Qty</th><th style="padding:10px;border-bottom:1px solid #ddd;text-align:right">Total</th></tr></thead>
                    <tbody>${items}</tbody>
                    <tfoot><tr><td colspan="2" style="padding:12px 10px;text-align:right;font-weight:bold">Order total</td><td style="padding:12px 10px;text-align:right;font-weight:bold">${escapeHtml(data.totalAmountFormatted)}</td></tr></tfoot>
                </table>
                ${isSeller ? `
                    <h2 style="font-size:17px">Customer and delivery details</h2>
                    <p><strong>Name:</strong> ${escapeHtml(data.customerName)}<br><strong>Email:</strong> ${escapeHtml(data.customerEmail)}<br><strong>Phone:</strong> ${escapeHtml(data.customerPhone)}<br><strong>Address:</strong> ${escapeHtml(data.shippingAddress)}<br><strong>Requested delivery:</strong> ${escapeHtml(data.deliveryDate || 'Not specified')} ${escapeHtml(data.deliveryTime || '')} ${escapeHtml(data.deliveryTimeZone || '')}</p>
                    ${data.note ? `<p><strong>Note:</strong> ${escapeHtml(data.note)}</p>` : ''}
                ` : `<p>Delivery address: ${escapeHtml(data.shippingAddress)}<br><strong>Requested delivery:</strong> ${escapeHtml(data.deliveryDate || 'Not specified')} ${escapeHtml(data.deliveryTime || '')} ${escapeHtml(data.deliveryTimeZone || '')}</p>`}
                <p style="margin-bottom:0;color:#666;font-size:12px">${isApproved ? 'Payment has been verified by the Eventsora team.' : isRejected ? 'This order was not approved for fulfillment.' : statusMessage ? `Current order status: ${escapeHtml(data.status)}.` : 'This order is awaiting Eventsora review. The seller has not received it yet.'}</p>
            </main>
        </body>
        </html>
    `
}
