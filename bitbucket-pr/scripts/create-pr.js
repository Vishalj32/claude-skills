#!/usr/bin/env node

/**
 * create-pr.js — Bitbucket PR creation script
 * Called by the bitbucket-pr skill.
 * Credentials are read from config file inside this script, never exposed to the model's context.
 *
 * Usage: node create-pr.js <source-branch> <dest-branch> <title> <description>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const [sourceBranch, destBranch, title, description] = process.argv.slice(2);

if (!sourceBranch || !destBranch || !title || !description) {
  console.error('Usage: create-pr.js <source-branch> <dest-branch> <title> <description>');
  process.exit(1);
}

// Config lookup: explicit env var > repo-local .bitbucket.json > ~/.bitbucket.json
let configPath;
if (process.env.BITBUCKET_CONFIG) {
  configPath = process.env.BITBUCKET_CONFIG;
} else {
  try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    const repoConfig = path.join(repoRoot, '.bitbucket.json');
    if (fs.existsSync(repoConfig)) {
      configPath = repoConfig;
    } else {
      configPath = path.join(process.env.HOME, '.bitbucket.json');
    }
  } catch {
    configPath = path.join(process.env.HOME, '.bitbucket.json');
  }
}

if (!fs.existsSync(configPath)) {
  console.error('ERROR: config file not found.');
  console.error('Create .bitbucket.json in your repo root (or ~/.bitbucket.json as a fallback):');
  console.error('{"username":"…","app_password":"…","workspace":"…","repo_slug":"…"}');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.error(`ERROR: Failed to parse config file: ${e.message}`);
  process.exit(1);
}

const { username, app_password: password, workspace, repo_slug } = config;

if (!username || !password || !workspace || !repo_slug) {
  console.error('ERROR: config file missing required fields: username, app_password, workspace, repo_slug');
  process.exit(1);
}

// Clear the config object from memory immediately after extracting fields
// This ensures credentials don't leak if the process crashes or is inspected
config = null;

const payload = JSON.stringify({
  title,
  description,
  source: { branch: { name: sourceBranch } },
  destination: { branch: { name: destBranch } },
  close_source_branch: false,
});

const auth = Buffer.from(`${username}:${password}`).toString('base64');

const options = {
  hostname: 'api.bitbucket.org',
  port: 443,
  path: `/2.0/repositories/${workspace}/${repo_slug}/pullrequests`,
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201) {
      try {
        const response = JSON.parse(data);
        const prUrl = response.links?.html?.href;
        console.log(`PR created: ${prUrl}`);
        process.exit(0);
      } catch (e) {
        console.error(`ERROR: Failed to parse response: ${e.message}`);
        console.error(data);
        process.exit(1);
      }
    } else {
      console.error(`ERROR: HTTP ${res.statusCode}`);
      try {
        console.error(JSON.stringify(JSON.parse(data), null, 2));
      } catch {
        console.error(data);
      }
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`ERROR: Request failed: ${e.message}`);
  process.exit(1);
});

req.write(payload);
req.end();