import mongoose from 'mongoose';

const shopCategorySchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true })
const shopCategoryModel = mongoose.models.ShopCategory || mongoose.model('ShopCategory', shopCategorySchema, 'shopcategories')

export default shopCategoryModel