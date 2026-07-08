import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    // hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    
     hotel: { type:String, ref: "Hotel", required: true },
     roomType: {type: String,required:true},
      description: {type: String, default: ""},
      pricePerNight: {type: Number,required:true},
      maxGuests: {type: Number, required: true, default: 2, min: 1},
      amenities: {type:Array ,required:true},
       images:[{type:String}],
    isAvailable: {type: Boolean, default:true},
},{timestamps: true});

const Room = mongoose.model("Room", roomSchema);

export default Room;
