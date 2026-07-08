import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    _id: {type : String , required: true},
    username: {type : String , required: true},
    email: {type : String , required: true, unique: true},
    image: {type : String , default: ""},
    // Only set for users who signed up with email/password.
    // Google-only users won't have this field.
    password: {type : String},
role: {type : String , enum:["guest","receptionist","cashier","admin"], default: "guest"},
    // "admin" = you / hotel owner (full access)
    // "receptionist" = front-desk staff (limited access, added in a later step)
    // "guest" = normal booking user (default)

    }, {timestamps:true})


    const User = mongoose.model("User", userSchema);

    export default User;