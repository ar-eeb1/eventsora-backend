import mongoose from 'mongoose'

const mediaSchema = new mongoose.Schema({
    secure_url: String,
    thumbnail_url: String,
    alt: String,
    title: String,
    deletedAt: Date,
}, { collection: 'medias' })

const MediaModel = mongoose.models.Media || mongoose.model('Media', mediaSchema)
export default MediaModel
