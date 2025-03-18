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
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    return response.data.diff_url; // ✅ PR diff URL
  } catch (error) {
    console.error("❌ Error fetching PR diff:", error);
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
