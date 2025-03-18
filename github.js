import axios from "axios";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // ✅ Use the stored GitHub token
});

// ✅ Fetch PR Diff
export const fetchPRDiff = async (owner, repo, prNumber, installationId) => {
    try {
      if (!installationId) {
        console.error("❌ Error: Missing GitHub Installation ID!");
        return null;
      }
  
      const token = await getGitHubInstallationToken(installationId);
      if (!token) throw new Error("Failed to retrieve GitHub App token");
  
      const octokit = new Octokit({ auth: token });
  
      // 🔥 Fetch commit list first
      const commitsResponse = await octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
      });
  
      if (!commitsResponse.data.length) {
        console.error("❌ Error: No commits found in PR!");
        return null;
      }
  
      const latestCommitSHA = commitsResponse.data[commitsResponse.data.length - 1].sha;
  
      // ✅ Fetch only the latest commit diff
      const commitDiff = await octokit.repos.getCommit({
        owner,
        repo,
        ref: latestCommitSHA,
      });
  
      if (!commitDiff.data.files) {
        console.error("❌ Error: No changed files detected in commit!");
        return null;
      }
  
      return commitDiff.data.files.map(file => ({
        filename: file.filename,
        patch: file.patch || "No patch available.",
      }));
  
    } catch (error) {
      console.error("❌ Error fetching latest commit diff:", error);
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
