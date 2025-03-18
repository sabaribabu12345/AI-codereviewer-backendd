import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import Review from "./models/Review.js"; // Import MongoDB Schema
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { fetchPRDiff, postPRComment } from "./github.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Connect to MongoDB (Handles Errors Properly)
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("🚀 Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ AI Code Review API
app.post("/review", async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: "No code provided!" });

  try {
    const prompt = `
    You are an expert AI software engineer.  
    Your task is to analyze and improve the given code by:  
    - Fixing performance issues  
    - Improving readability & structure  
    - Enhancing security  
    - Following best coding practices  

    ---
    ### 🔹 **Original Code:**
    \`\`\`${code}\`\`\`

    ---
    ### 🔹 **AI Code Review:**  
    1️⃣ Summary of what the code does  
    2️⃣ Problems & Areas for Improvement  
    3️⃣ Code Quality Score (1-10)  
    4️⃣ Security & Performance Risks  

    ---
    ### 🔹 **Optimized Code:**  
    \`\`\`
// AI will generate the improved version of this code here
    \`\`\`
    ---
    🚀 Ensure the optimized code is well-structured, secure, and error-free.  
    `;

    // ✅ Call OpenRouter API to Analyze & Fix Code
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-3-4b-it:free", // ✅ Free Model
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
    console.log("🔍 AI Response:", response.data);
    const aiResponseText = response.data?.choices?.[0]?.message?.content || "⚠️ AI was unable to process this request.";
    const [reviewPart, optimizedCodePart] = aiResponseText.split("### 🔹 **Optimized Code:**");

    const reviewText = reviewPart?.trim() || "⚠️ No AI review was generated.";
    const optimizedCode = optimizedCodePart ? optimizedCodePart.replace(/\`\`\`/g, "").trim() : "⚠️ No optimized code provided.";

    // ✅ Prevent Empty Reviews from Being Stored
    if (!reviewText || reviewText.trim() === "⚠️ No AI review was generated.") {
      return res.status(500).json({ error: "AI did not generate a valid review." });
    }

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

// ✅ Default Route (Fixes "Cannot GET /" Error)
app.get("/", (req, res) => {
  res.send("🚀 AI Code Reviewer Backend is Running!");
});
// ✅ GitHub Webhook Route (Receives PR Events)
app.post("/webhook", async (req, res) => {
  const payload = req.body;

  if (payload.action === "opened" && payload.pull_request) {
    const { repository, pull_request } = payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;

    console.log(`🔍 New PR Opened: ${repo} #${prNumber}`);

    // ✅ Fetch PR Diff
    const prDiffUrl = await fetchPRDiff(owner, repo, prNumber);
    if (!prDiffUrl) return res.status(500).json({ error: "Failed to fetch PR diff" });

    // ✅ AI Review Processing (Google Gemini via OpenRouter)
    const aiReview = await analyzePRWithAI(prDiffUrl);
    if (!aiReview) return res.status(500).json({ error: "AI Review failed" });

    // ✅ Post AI Review as a PR Comment
    await postPRComment(owner, repo, prNumber, aiReview);

    res.json({ message: "AI Review posted!" });
  } else {
    res.json({ message: "Event ignored" });
  }
});

// ✅ AI Code Review Logic (Google Gemini via OpenRouter)
const analyzePRWithAI = async (diffUrl) => {
  try {
    const prompt = `
You are an AI GitHub PR Reviewer. Review ONLY the changed lines in this pull request. 

- **DO NOT review unrelated code.**
- **DO NOT suggest fixes for unchanged parts of the file.**
- **DO NOT mention code that already existed before this PR.**

🔍 Here is the PR diff containing only the changed lines:
\n\n${diffUrl}

⚡ Respond concisely and ONLY give feedback on these exact changes.
`;



    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-3-4b-it:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("AI Review Error:", error.response?.data || error.message);
    return null;
  }
};
// ✅ Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));