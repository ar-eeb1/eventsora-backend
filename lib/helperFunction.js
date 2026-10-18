export const response = (res, success, statusCode, message, data = {}) => {
    return res.status(statusCode).json({
        success, statusCode, message, data,
    });
};
export const catchError = (res, error, customMessage) => {
    if (error.code === 11000) {
        const keys = Object.keys(error.keyPattern).join(',')
        error.message = `Duplicate Fields: ${keys}. These fields value must be unique.`
    }

    let errorObj = {}

    if (process.env.NODE_ENV === 'development') {
        errorObj = {
            message: error.message,
            error
        }
    } else {
        errorObj = {
            message: customMessage || 'Internal Server Error'
        }
    }

    const statusCode = error.statusCode || error.code || 500;
    const finalCode = typeof statusCode === 'number' ? statusCode : 500;

    return response(res, false, finalCode, error.message || customMessage || 'Internal Server Error', errorObj)
}

export const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    return otp
}

export const escapeRegExp = (string) => {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
