// check-and-update.js
require('dotenv').config({ override: true });

const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const { execSync } = require("child_process"); // For running shell commands
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    FILE_PATH,
    BASE_BRANCH = "main",
    FACTORIO_RELEASE_CHANNEL = "stable",
    GPG_KEY_ID,
    GPG_PASSPHRASE,
    GPG_PRIVATE_KEY,
    FORCE_UPDATE_VERSION // For testing
} = process.env;

const FACTORIO_API_URL = "https://factorio.com/api/latest-releases";

/**
 * Fetches the latest headless version of Factorio from the new API endpoint.
 */
async function getLatestFactorioVersion() {
    console.log(`[1/4] Fetching latest version for '${FACTORIO_RELEASE_CHANNEL}' channel from ${FACTORIO_API_URL}...`);
    const { data } = await axios.get(FACTORIO_API_URL);
    
    // Check if the specified channel (e.g., 'stable') exists in the response
    if (!data || !data[FACTORIO_RELEASE_CHANNEL]) {
        throw new Error(`Release channel '${FACTORIO_RELEASE_CHANNEL}' not found in Factorio API response.`);
    }

    const latestVersion = data[FACTORIO_RELEASE_CHANNEL].headless;
    
    if (!latestVersion) {
        throw new Error(`Could not find 'headless' version for channel '${FACTORIO_RELEASE_CHANNEL}'.`);
    }

    console.log(`   - Latest official '${FACTORIO_RELEASE_CHANNEL}' version found: ${latestVersion}`);
    return latestVersion;
}

/**
 * Gets the current version from the specified file in your GitHub repo.
 */
async function getCurrentRepoVersion(octokit) {
    console.log(`[2/4] Fetching current version from repo file: ${FILE_PATH}...`);
    const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: BASE_BRANCH,
    });
    // Decode Base64 content from GitHub API
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const currentVersion = content.trim();
    console.log(`   - Current version in repo: ${currentVersion}`);
    return currentVersion;
}

/**
 * This function uses Git and GPG command-line tools to create a signed commit,
 * pushes the branch, and then uses the API to create a PR.
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
        console.log(`[1/6] Cloning repository into '${repoDir}'...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
        execSync(`git clone --depth=1 --branch=${BASE_BRANCH} ${repoUrl} ${repoDir}`);

        // Set the current working directory for all subsequent commands
        const execOptions = { cwd: repoDir };

        // 2. Configure Git and GPG
        console.log(`[2/6] Configuring Git and GPG...`);
        execSync(`git config user.name "${GITHUB_OWNER}"`, execOptions);
        execSync(`git config user.email "bryan+git@nonstopdev.com"`, execOptions);
        execSync(`git config gpg.program gpg`, execOptions);
        execSync(`git config user.signingkey ${GPG_KEY_ID}`, execOptions);
        execSync(`git config commit.gpgsign true`, execOptions); // Sign all commits

        // 3. Import the GPG key
        console.log(`[3/6] Importing GPG private key...`);
        execSync(`echo "${GPG_PRIVATE_KEY}" | gpg --batch --import`);
        // Configure gpg-agent to allow non-interactive passphrase entry
        execSync(`echo "allow-loopback-pinentry" >> ~/.gnupg/gpg-agent.conf`);
        execSync('gpg-connect-agent reloadagent /bye');

        // 4. Create new branch, modify the file
        console.log(`[4/6] Creating branch and updating file...`);
        execSync(`git checkout -b ${newBranchName}`, execOptions);
        fs.writeFileSync(path.join(repoDir, FILE_PATH), `${newVersion}\n`);

        // 5. Create the signed commit
        console.log(`[5/6] Creating signed commit...`);
        execSync(`git add ${FILE_PATH}`, execOptions);
        // Use GPG agent with loopback pinentry to provide passphrase
        execSync(`echo "${GPG_PASSPHRASE}" | gpg --pinentry-mode loopback --passphrase-fd 0 --batch --yes -s -b -o /dev/null /dev/null 2>/dev/null && git commit -m "${commitMessage}"`, execOptions);

        // 6. Push the new branch to GitHub
        console.log(`[6/6] Pushing new branch to origin...`);
        execSync(`git push -u origin ${newBranchName}`, execOptions);

        // 7. Use the API to create the PR
        console.log(`[7/7] Creating Pull Request via API...`);
        const { data: pr } = await octokit.pulls.create({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            title: prTitle,
            body: prBody,
            head: newBranchName,
            base: BASE_BRANCH
        });

        console.log(`   - ✅ Pull Request #${pr.number} created and is ready for manual review.`);
        console.log(`   - URL: ${pr.html_url}`);

    } catch (error) {
        console.error("An error occurred during the git operations:");
        // Try to print the stderr from the child process if available
        if (error.stderr) {
            throw new Error(error.stderr.toString());
        } else {
            throw error;
        }
    } finally {
        // Always clean up the local repository folder
        console.log(`   - Cleaning up local repository folder...`);
        fs.rmSync(repoDir, { recursive: true, force: true });
    }
}

async function main() {
    // Basic validation
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !FILE_PATH || !GPG_KEY_ID || !GPG_PRIVATE_KEY) {
        console.error("Error: Missing required environment variables, including GPG secrets.");
        process.exit(1);
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        // --- FORCE UPDATE LOGIC ---
        if (FORCE_UPDATE_VERSION) {
            console.warn(`⚠️  FORCE_UPDATE_VERSION is set to '${FORCE_UPDATE_VERSION}'.`);
            console.warn("   - Bypassing live version checks and forcing a GitHub update.");
            await updateGithubFile(octokit, FORCE_UPDATE_VERSION);
            console.log("\n✅ Forced update complete! PR created.");
            return;
        }

        // --- STANDARD CHECK LOGIC ---
        const latestOfficialVersion = await getLatestFactorioVersion();
        const currentRepoVersion = await getCurrentRepoVersion(octokit);

        console.log("[3/4] Comparing versions...");
        if (latestOfficialVersion === currentRepoVersion) {
            console.log("✅ Versions are in sync. No update needed. Exiting.");
            return;
        }

        console.log(`   - New version detected! Proceeding with update...`);
        console.log(`   - Current: ${currentRepoVersion} -> New: ${latestOfficialVersion}`);

        console.log("[4/4] Starting GitHub update process...");
        await updateGithubFile(octokit, latestOfficialVersion);
        
        console.log("\n✅ Success! A Pull Request has been created and is ready for review.");

    } catch (error) {
        console.error("❌ An error occurred during the process:");
        console.error(error.message || error);
        process.exit(1);
    }
}

main(); // Start the script
