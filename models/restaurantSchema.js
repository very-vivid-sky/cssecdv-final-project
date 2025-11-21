const mongoose = require ("mongoose");

const restaurantSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        contactNumber: { type: String, required: true },
        totalReviews: { type:Number, default: 0 },
        rating: { type: Number, min: 0, max: 5 },

        openingTime: {
            h: {type: Number, required: true, min: 0, max: 23},
            m: {type: Number, required: true, min: 0, max: 59}
        },

        closingTime: {
            h: {type: Number, required: true, min: 0, max: 23},
            m: {type: Number, required: true, min: 0, max: 59}
        },

        bannerPhoto: {type: String, required: true },

        images:[{
            type: String,
            required: true
        }],
        
        allReviews:[{
            type: String,
            default: null
        }],

        estOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required : true
        },
    },
    
    {
        timestamps:true,
    },
    
    {
        toJSON: {virtuals: true},
        toObject:{virtuals: true},
    }
);


restaurantSchema.virtual('reviews',{
    ref: 'Review',
    localField: '_id',
    foreignField: 'restaurantAcc'
});

const Restaurant = mongoose.model('restaurant', restaurantSchema);
module.exports = Restaurant;