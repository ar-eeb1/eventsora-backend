export const manualBookingEmail = (data) => {
    const totalReceived = data.receivedAmount || 0;
    const balance = data.totalAmount - totalReceived;
    // Using a more standard date format for invoices
    const date = new Date().toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; background-color: #f4f4f7; }
        .wrapper { padding: 40px 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
        
        /* Brand Header */
        .brand-bar { background-color: #db2777; height: 6px; width: 100%; }
        .header { padding: 32px 40px; border-bottom: 1px solid #f3f4f6; }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .logo-area img { max-width: 140px; height: auto; }
        
        /* Typography */
        h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0; letter-spacing: -0.02em; }
        .invoice-id { color: #6b7280; font-size: 14px; margin-top: 4px; }
        
        /* Grid Layout */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 32px 40px; background-color: #fafafa; }
        .section-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .info-content { font-size: 14px; color: #374151; }
        .info-content strong { color: #111827; }

        /* Table Styling */
        .table-container { padding: 0 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th { text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; padding: 12px 0; border-bottom: 2px solid #f3f4f6; text-transform: uppercase; }
        td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; vertical-align: top; }
        
        /* Financials */
        .totals-section { padding: 32px 40px; display: flex; justify-content: flex-end; }
        .totals-table { width: 240px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #4b5563; }
        .total-row.grand { margin-top: 12px; padding-top: 12px; border-top: 2px solid #f3f4f6; color: #111827; font-weight: 700; font-size: 16px; }
        .highlight-red { color: #dc2626; }
        .highlight-green { color: #059669; }

        .footer { padding: 32px 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 4px 0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="brand-bar"></div>
            
            <div class="header">
                <div style="display: flex; justify-content: space-between;">
                    <div class="logo-area">
                        <img src="https://res.cloudinary.com/dliahmplq/image/upload/v1764930727/eventsora_bvxigy.png" alt="Eventsora">
                        <p style="margin: 12px 0 0 0; font-weight: 600; color: #db2777; font-size: 18px;">
                            ${data.listings && data.listings.length > 0 ? data.listings[0].name : 'Eventsora'}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <h1>Booking Invoice</h1>
                        <p class="invoice-id">#${data.booking_id}</p>
                        <p class="invoice-id">${date}</p>
                    </div>
                </div>
            </div>

            <div class="info-grid">
                <div>
                    <div class="section-label">Billed To</div>
                    <div class="info-content">
                        <strong>${data.name}</strong><br>
                        ${data.email}<br>
                        ${data.phone}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="section-label">Event Details</div>
                    <div class="info-content">
                        <strong>Type:</strong> ${data.eventType || 'N/A'}<br>
                        <strong>Slot:</strong> ${data.timeSlot || 'N/A'}<br>
                        <strong>Guests:</strong> ${data.guestCount || 'N/A'}
                    </div>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Service Details</th>
                            <th>Dates</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.listings.map(item => `
                            <tr>
                                <td>
                                    <div style="font-weight: 600;">${item.name}</div>
                                    ${item.variantTitle ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.variantTitle}</div>` : ''}
                                </td>
                                <td style="font-size: 13px; color: #4b5563;">${item.bookingDate.join('<br>')}</td>
                                <td style="text-align: right; color: #6b7280;">${item.price.toLocaleString()}</td>
                                <td style="text-align: right; font-weight: 600;">${(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="totals-section">
                <div class="totals-table">
                    <div class="total-row">
                        <span>Total Charges</span>
                        <span>${data.totalAmount.toLocaleString()} PKR</span>
                    </div>
                    <div class="total-row" style="color: #059669;">
                        <span>Amount Received</span>
                        <span>-${totalReceived.toLocaleString()} PKR</span>
                    </div>
                    <div class="total-row grand">
                        <span>Balance Due</span>
                        <span class="${balance <= 0 ? 'highlight-green' : 'highlight-red'}">
                            ${balance <= 0 ? 'PAID' : `${balance.toLocaleString()} PKR`}
                        </span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p><strong>Thank you for choosing Eventsora!</strong></p>
                <p>For any queries regarding this invoice, please contact support@eventsora.com</p>
                <p>&copy; ${new Date().getFullYear()} Eventsora. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
    return html;
}