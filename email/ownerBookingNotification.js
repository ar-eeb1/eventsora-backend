export const ownerBookingNotification = (data) => {
    const html = `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Received</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .header { background-color: #9502f5; color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
        .content { padding: 30px; }
        .booking-id { font-size: 20px; font-weight: bold; color: #9502f5; margin-bottom: 20px; text-align: center; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .details-table th { color: #888; font-weight: normal; width: 140px; }
        .footer { background-color: #000; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }
        .button-container { text-align: center; margin-top: 30px; }
        .button { background-color: #9502f5; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dliahmplq/image/upload/v1764930727/eventsora_bvxigy.png" alt="Eventsora" width="180" style="margin-bottom: 15px;">
            <h1>YOU RECEIVED A NEW BOOKING!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${data.ownerName}</strong>,</p>
            <p>Great news! A new booking has been placed for one of your listings. Please review the details below:</p>
            
            <div class="booking-id">Booking ID: ${data.booking_id}</div>
            
            <p><strong>Booking Details:</strong></p>
            ${data.listings ?
            data.listings.map(item => `
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #9502f5;">
                        <table class="details-table" style="margin: 0;">
                            <tr>
                                <th>Listing:</th>
                                <td>${item.listingName}</td>
                            </tr>
                            ${item.variantTitle ? `<tr><th>Variant:</th><td>${item.variantTitle}</td></tr>` : ''}
                            <tr>
                                <th>Quantity:</th>
                                <td>${item.quantity}</td>
                            </tr>
                            <tr>
                                <th>Date(s):</th>
                                <td>${item.bookingDates}</td>
                            </tr>
                        </table>
                    </div>
                `).join('')
            :
            `
                <table class="details-table">
                    <tr>
                        <th>Listing:</th>
                        <td>${data.listingName}</td>
                    </tr>
                    ${data.variantTitle ? `<tr><th>Variant:</th><td>${data.variantTitle}</td></tr>` : ''}
                    <tr>
                        <th>Quantity:</th>
                        <td>${data.quantity}</td>
                    </tr>
                    <tr>
                        <th>Date(s):</th>
                        <td>${data.bookingDates}</td>
                    </tr>
                </table>
                `
        }

            <p style="margin-top: 25px;"><strong>Customer Information:</strong></p>
            <table class="details-table">
                <tr>
                    <th>Name:</th>
                    <td>${data.customerName}</td>
                </tr>
                <tr>
                    <th>Phone:</th>
                    <td>${data.customerPhone}</td>
                </tr>
            </table>

            <p>You can manage this booking and communicate with the customer through your vendor dashboard.</p>

            <div class="button-container">
                <a href="${data.vendorDashboardUrl}" class="button">VIEW IN DASHBOARD</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Eventsora. All rights reserved.</p>
            <p>Fuel for your inner glow.</p>
        </div>
    </div>
</body>
</html>
    `;
    return html;
};
