const mongoose = require ("mongoose");

const userSchema = mongoose.Schema(
    {
        userName:{
            type:String,
            required: true,
            unique: true,
            lowercase: true
        },


        userEmail:{
            type:String,
            required:true,
            unique: true

        },

        password :{
            type: String,
            minlength: 8,
            required: true
        },

        oldPasswords: {
            type: [String]
        },
        
        passwordLastChanged: {
            type: Date,
            default: Date.now
        },

        userDetails:{
            type:String
        },

        userPicture:{
            type:String,
            default: "default.png"
        },

        totalReviews :{
            type: Number,
            default: 0,
        },

        clientType :{
            type: String, 
            default: "guest"
        },

        isActive: {
            type: Boolean,
            default: true
        },
        
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        
        lockedUntil: {
            type: Date,
            default: null
        },
        
        lastFailedLoginAttempt: {
            type: Date,
            default: null
        }
        ,
        lastAccess: {
            at: { type: Date, default: null },
            success: { type: Boolean, default: null },
            ip: { type: String, default: null },
            userAgent: { type: String, default: null },
            note: { type: String, default: null }
        },
        
        securityQuestions: [
            {
                question: { type: String, required: true },
                answerHash: { type: String, required: true }
            }
        ]
    },
    
    {
        timestamps:true,
    },

    {
        toJSON: {virtuals: true},
        toObject:{virtuals: true},
    }
    
);

userSchema.virtual('reviews',{
    ref: 'Review',
    localField: '_id',
    foreignField: 'userAcc'
});



const User = mongoose.model('user', userSchema);
module.exports = User;