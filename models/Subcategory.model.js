import mongoose from 'mongoose'
import './Category.model.js'

const subcategorySchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    subcategory: String,
    slug: String,
    deletedAt: Date,
}, { collection: 'subcategories' })

const SubcategoryModel = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema)
export default SubcategoryModel
