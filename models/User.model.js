import mongoose from "mongoose";
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['user', 'provider', 'admin', 'master','suspended'],
        default: 'user'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        select: false
    },
    avatar: {
        url: {
            type: String,
            trim: true
        },
        public_id: {
            type: String,
            trim: true
        },
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
        phone: {
            type: String,
            trim: true
        },
    address: {
        type: String,
        trim: true
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    },
    expireAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
})


userSchema.methods = {
    comparePassword: async function (password) {
        return await bcrypt.compare(password, this.password)
    }
}

const UserModel = mongoose.models.User || mongoose.model('User', userSchema, 'users')
export default UserModel

