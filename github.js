import axios from "axios";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // ✅ Use the stored GitHub token
});

// ✅ Fetch PR Diff
export const fetchPRDiff = async (owner, repo, prNumber) => {
  try {
    console.log(`📢 Fetching PR Diff for: ${owner}/${repo} PR #${prNumber}`);

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        "User-Agent": "GitHub PR AI Reviewer",
        Accept: "application/vnd.github.v3.diff",
      },
    });

    console.log("✅ PR Diff Fetched Successfully!");

    if (!response.data || response.data.trim() === "") {
      console.error("❌ Error: PR Diff is empty!");
      return null;
    }

    console.log("🔍 PR Diff Full Response:", response.data); // Log the full diff
    return response.data; // PR diff
  } catch (error) {
    console.error("❌ GitHub API Error:", error.response?.data || error.message);
    return null;
  }
};



// ✅ Post AI Review as a Comment on the PR
export const postPRComment = async (owner, repo, prNumber, comment) => {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });
    console.log("✅ AI Review Comment Posted on PR!");
  } catch (error) {
    console.error("❌ Error posting PR comment:", error.response?.data || error.message);
  }
};
