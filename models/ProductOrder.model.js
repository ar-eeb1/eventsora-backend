import mongoose from 'mongoose'

const productOrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
        productName: { type: String, required: true },
        variantName: { type: String, default: null },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        lineTotal: { type: Number, required: true, min: 0 },
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    deliveryTime: { type: String, required: true },
    deliveryTimeZone: { type: String, default: 'Asia/Karachi', required: true },
    note: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'accepted', 'preparing', 'ready_to_ship', 'shipped', 'rejected', 'fulfilled', 'cancelled'],
        default: 'pending',
        index: true,
    },
    reviewStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    releasedAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: 'productorders' })

productOrderSchema.index({ buyer: 1, createdAt: -1 })
productOrderSchema.index({ seller: 1, createdAt: -1 })

const ProductOrderModel = mongoose.models.ProductOrder
    || mongoose.model('ProductOrder', productOrderSchema)
export default ProductOrderModel
