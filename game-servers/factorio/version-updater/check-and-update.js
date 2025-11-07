// check-and-update.js
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const { execSync } = require("child_process"); // For running shell commands
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const {
    GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, FILE_PATH, BASE_BRANCH = "main",
    GPG_KEY_ID, GPG_PASSPHRASE, GPG_PRIVATE_KEY,
    FORCE_UPDATE_VERSION // For testing
} = process.env;

const FACTORIO_API_URL = "https://factorio.com/api/latest-releases";

/**
 * --- COMPLETELY REWRITTEN FUNCTION ---
 * This function now uses Git and GPG command-line tools to create a signed commit.
 */
async function updateGithubFile(octokit, newVersion) {
    const newBranchName = `bot/version-update-${newVersion}`;
    const commitMessage = `ci: Update Factorio version to ${newVersion}`;
    const prTitle = `🚀 Release: Factorio Server ${newVersion}`;
    const prBody = `This is an automated PR to update the Factorio server version to **${newVersion}**. Merging this PR will trigger the build and release workflow.`;
    const repoUrl = `https://${GITHUB_OWNER}:${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;
    const repoDir = "temp_repo";

    console.log("--- Starting Git Operations with Signing ---");

    try {
        // 1. Clean up previous run and clone the repo
        console.log(`[1/7] Cloning repository into '${repoDir}'...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
        execSync(`git clone --depth=1 --branch=${BASE_BRANCH} ${repoUrl} ${repoDir}`);

        // Set the current working directory for all subsequent commands
        const execOptions = { cwd: repoDir };

        // 2. Configure Git and GPG
        console.log(`[2/7] Configuring Git and GPG...`);
        execSync(`git config user.name "${GITHUB_OWNER}"`, execOptions);
        execSync(`git config user.email "bryan+git@nonstopdev.com"`, execOptions);
        execSync(`git config gpg.program gpg`, execOptions);
        execSync(`git config user.signingkey ${GPG_KEY_ID}`, execOptions);
        execSync(`git config commit.gpgsign true`, execOptions); // Sign all commits

        // 3. Import the GPG key
        console.log(`[3/7] Importing GPG private key...`);
        execSync(`echo "${GPG_PRIVATE_KEY}" | gpg --batch --import`);
        // Configure gpg-agent to allow non-interactive passphrase entry
        execSync(`echo "allow-loopback-pinentry" >> ~/.gnupg/gpg-agent.conf`);
        execSync('gpg-connect-agent reloadagent /bye');

        // 4. Create new branch, modify the file
        console.log(`[4/7] Creating branch and updating file...`);
        execSync(`git checkout -b ${newBranchName}`, execOptions);
        fs.writeFileSync(path.join(repoDir, FILE_PATH), `${newVersion}\n`);

        // 5. Create the signed commit
        console.log(`[5/7] Creating signed commit...`);
        execSync(`git add ${FILE_PATH}`, execOptions);
        // Use GPG agent with loopback pinentry to provide passphrase
        execSync(`echo "${GPG_PASSPHRASE}" | gpg --pinentry-mode loopback --passphrase-fd 0 --batch --yes -s -b -o /dev/null /dev/null 2>/dev/null && git commit -m "${commitMessage}"`, execOptions);

        // 6. Push the new branch to GitHub
        console.log(`[6/7] Pushing new branch to origin...`);
        execSync(`git push -u origin ${newBranchName}`, execOptions);

        // 7. Use the API to create and merge the PR
        /* DONT MERGE
        console.log(`[7/7] Creating and merging Pull Request via API...`);
        const { data: pr } = await octokit.pulls.create({ owner: GITHUB_OWNER, repo: GITHUB_REPO, title: prTitle, body: prBody, head: newBranchName, base: BASE_BRANCH });
        console.log(`   - PR #${pr.number} created.`);
        const { data: mergeResult } = await octokit.pulls.merge({ owner: GITHUB_OWNER, repo: GITHUB_REPO, pull_number: pr.number, merge_method: "squash" });
        console.log(`   - PR merged successfully! SHA: ${mergeResult.sha}`);
        */

    } catch (error) {
        console.error("An error occurred during the git operations:");
        throw new Error(error.stderr ? error.stderr.toString() : error.message);
    } finally {
        // Always clean up the local repository folder
        console.log(`   - Cleaning up local repository folder...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
    }
}


// --- These functions below are unchanged but required for the script to run ---

async function getLatestFactorioVersion() { /* ... function from previous step ... */ }
async function getCurrentRepoVersion(octokit) { /* ... function from previous step ... */ }
async function main() {
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !FILE_PATH || !GPG_KEY_ID || !GPG_PRIVATE_KEY) {
        console.error("Error: Missing required environment variables, including GPG secrets.");
        process.exit(1);
    }
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    try {
        if (FORCE_UPDATE_VERSION) {
            console.warn(`⚠️  FORCE_UPDATE_VERSION is set to '${FORCE_UPDATE_VERSION}'.`);
            console.warn("   - Bypassing live version checks and forcing a GitHub update.");
            await updateGithubFile(octokit, FORCE_UPDATE_VERSION);
            console.log("\n✅ Forced update complete! Your GitHub Action should be running.");
            return;
        }
        const latestOfficialVersion = await getLatestFactorioVersion();
        const currentRepoVersion = await getCurrentRepoVersion(octokit);
        if (latestOfficialVersion === currentRepoVersion) {
            console.log("✅ Versions are in sync. No update needed. Exiting.");
            return;
        }
        console.log(`   - New version detected! Proceeding with update...`);
        await updateGithubFile(octokit, latestOfficialVersion);
        console.log("\n✅ Success! Your GitHub Action should now be running with the new version.");
    } catch (error) {
        console.error("❌ An error occurred during the process:");
        console.error(error.message || error);
        process.exit(1);
    }
}

main(); // Start the script
