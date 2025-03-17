import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  code: { type: String, required: true },
  review: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model("Review", ReviewSchema);
export default Review;
