const handleDuplicateKeyError = (error, next) => {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const duplicateKey = Object.keys(error.keyValue)[0]
        const capitalizedKey = duplicateKey.charAt(0).toUpperCase() + duplicateKey.slice(1) // capitalize
        next(new Error(`${capitalizedKey} is already taken. Please choose a different ${duplicateKey}.`))
    } else {
        next(error) // pass other errors along
    }
}

module.exports = handleDuplicateKeyError