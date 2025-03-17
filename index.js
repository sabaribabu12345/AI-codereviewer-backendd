import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import Review from "./models/Review.js"; // Import MongoDB Model for Reviews



const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 AI Code Reviewer Backend is Running!");
});

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("🚀 Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ AI Code Review API
app.post("/review", async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: "No code provided!" });

  try {
    const prompt = `
    You are an **expert AI software engineer**.  
    Your task is to **analyze and improve the given code** by:  
    - **Fixing performance issues**  
    - **Improving readability & structure**  
    - **Enhancing security**  
    - **Following best coding practices**  

    ---
    ### 🔹 **Original Code:**
    \`\`\`${code}\`\`\`

    ---
    ### 🔹 **AI Code Review:**  
    1️⃣ **Summary of what the code does**  
    2️⃣ **Problems & Areas for Improvement**  
    3️⃣ **Code Quality Score (1-10)**  
    4️⃣ **Security & Performance Risks**  

    ---
    ### 🔹 **Optimized Code:**  
    \`\`\`
// AI will generate the improved version of this code here
    \`\`\`
    ---
    🚀 **Ensure the optimized code is well-structured, secure, and error-free.**  
    `;

    // ✅ Call OpenRouter API to Analyze & Fix Code
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "open-r1/olympiccoder-7b:free",
        messages: [
          { role: "system", content: "You are an advanced AI code reviewer and optimizer." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // ✅ Extract AI Review and Optimized Code
    const aiResponseText = response.data.choices[0].message.content;
    const [reviewPart, optimizedCodePart] = aiResponseText.split("### 🔹 **Optimized Code:**");

    const reviewText = reviewPart.trim();
    const optimizedCode = optimizedCodePart ? optimizedCodePart.replace(/\`\`\`/g, "").trim() : "No optimized code provided.";

    // ✅ Save Review to MongoDB
    const newReview = new Review({ code, review: reviewText, optimizedCode });
    await newReview.save();

    res.json({ review: reviewText, optimizedCode });
  } catch (error) {
    console.error("❌ OpenRouter API Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error processing AI request" });
  }
});

// ✅ API to Get All Reviews
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Error fetching reviews" });
  }
});

// ✅ API to Delete a Review
app.delete("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Review.findByIdAndDelete(id);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting review" });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
