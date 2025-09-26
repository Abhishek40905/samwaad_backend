import mongoose from "mongoose";

const connectDB =async()=>{
    try {
    await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
        })
        .then(() => console.log("MongoDB connected"))
        .catch(err => console.error("MongoDB connection error:", err));
        } catch (error) {
            console.log("mongo db connection failed",error);
        }

}

export default connectDB;
