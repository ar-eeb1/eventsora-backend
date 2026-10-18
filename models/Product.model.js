import mongoose from 'mongoose'
import './ShopCategory.model.js'

const productSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopCategory', required: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopSubCategory', required: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    stockType: { type: String, enum: ['in_stock', 'made_to_order'], default: 'in_stock' },
    stockQuantity: { type: Number, default: 0, min: 0 },
    minimumOrderQuantity: { type: Number, default: 1, min: 1 },
    processingTime: {
        value: { type: Number, default: 0, min: 0 },
        unit: { type: String, enum: ['hours', 'days'], default: 'days' },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'draft'], default: 'pending' },
    deletedAt: { type: Date, default: null, index: true },
    inquirePrice: { type: Boolean, default: false },
}, { timestamps: true, collection: 'products' })

const ProductModel = mongoose.models.Product || mongoose.model('Product', productSchema)
export default ProductModel
