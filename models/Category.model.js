import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
    category: String,
    slug: String,
    deletedAt: Date,
}, { collection: 'categories' })

const CategoryModel = mongoose.models.Category || mongoose.model('Category', categorySchema)
export default CategoryModel
