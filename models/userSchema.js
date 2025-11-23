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
        
        userDetails:{
            type:String
        },

        userPicture:{
            type:String
        },

        totalReviews :{
            type: Number,
            default: 0,
        },

        clientType :{
            type: String, 
            default: "guest"
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