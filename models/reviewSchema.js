const mongoose = require ("mongoose");

const reviewSchema =  mongoose.Schema(
    {
        userAcc:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required : true
        },
        
        reviewBody :{
            type: String, 
            required: true
        },
        
        restaurantAcc:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'restaurant',
            required : true
        },

        rating:{
            type: Number, 
            required: true
        },

        helpful :{
            type: Number,
            default: 0,
            required: true
        },

        nothelpful :{
            type: Number,
            default: 0,
            required: true
        },

        images: {
            type: Array
        },

        establishmentResponse: {
            body: {type: String, default: null}
        }

    },
    
    {
        timestamps:true,
    }
    
);

const Review = mongoose.model('review', reviewSchema);
module.exports = Review;