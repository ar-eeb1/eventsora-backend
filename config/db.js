import mongoose from "mongoose"

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI

        if (!mongoUri) {
            throw new Error("MONGO_URI or MONGODB_URI is not defined")
        }

        console.log("Mongo URI loaded successfully")
        const conn = await mongoose.connect(mongoUri, {
            dbName: process.env.DB_NAME || 'EVENTSORA'
        })
        console.log(`Mongo Connected to Database: ${conn.connection.name}`)
    } catch (error) {
        console.log(`Error: ${error.message}`)
    }
}

export default connectDB