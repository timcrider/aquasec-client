/**
 * GitHub helper
 */

const { SearchCodeRequest } = require('octokit');


class GitHub {
  constructor(octokit) {
    this.octokit = octokit;
  }

  /**
   * Get releases for a repository
   *
   * @param {string} repoOwner Repository owner
   * @param {string} repoName Repostiory name
   * @param {string} version Semver to match
   * @returns array Matching release(s)
   */
  async getReleases(repoOwner, repoName, version="") {
    let releases = await this.octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner: repoOwner,
      repo: repoName
    });

    // Filter the releases to only those that match the version we're trying to publish
    if (version !== "") {
      releases = releases.data.filter((release) => {
        return release.tag_name === version;
      });
    }

    return releases;
  };

  /**
   * Get tags for a repository
   *
   * @param {string} repoOwner Repository owner
   * @param {string} repoName Repostiory name
   * @param {string} version Semver to match
   * @returns array Matching tag(s)
   */
  async getTags(repoOwner, repoName, version="") {
    let tags = await this.octokit.request('GET /repos/{owner}/{repo}/tags', {
      owner: repoOwner,
      repo: repoName
    });

    // Filter the releases to only those that match the version we're trying to publish
    if (version !== "") {
      tags = tags.data.filter((tag) => {
        return tag.name === version;
      });
    }

    return tags;
  };

  /**
   * Fetch remote package.json from main branch
   *
   * @param {string} repoOwner Repository owner
   * @param {string} repoName Repostiory name
   * @returns object package.json contents
   * @throws Error if the request fails or the contents cannot be decoded
   * @todo This should probably be a generic function that takes a branch name
   */
  async fetchRemotePackage(repoOwner, repoName) {
    let search = await this.octokit.request(`GET /repos/${repoOwner}/${repoName}/contents/package.json`, {
      ref: 'main',
      per_page: 1,
      page: 1
    });

    if (search.status !== 200) {
      throw new Error(`Failed to fetch remote main version: ${search.status}`);
    }

    try {
      let contents = JSON.parse(Buffer.from(search.data.content, 'base64').toString());
      return contents;
    } catch (err) {
      throw new Error(`Failed to decode remote main version: ${err.message}`);
    }
  };

  /**
   * Fetch remote main branch SHA
   *
   * @param {string} repoOwner Repository owner
   * @param {string} repoName Repostiory name
   * @returns string SHA of the last commit on the main branch
   * @throws Error if the request fails or the SHA cannot be found
   * @todo This should probably be a generic function that takes a branch name
   */
  async fetchRemoteBranchSha(repoOwner, repoName) {
    let lastCommit = await this.octokit.request(`GET /repos/${repoOwner}/${repoName}/commits`, {
      ref: 'main',
      per_page: 1,
      page: 1
    });

    if (lastCommit.status !== 200) {
      throw new Error(`Failed to fetch remote main branch: ${lastCommit.status}`);
    }

    if (lastCommit.data.length === 0) {
      throw new Error(`Failed to fetch remote main branch: No commits found`);
    }

    if (lastCommit.data[0].sha) {
      return lastCommit.data[0].sha;
    }

    throw new Error(`Failed to fetch remote main branch: No commit SHA found`);
  };

  /**
   * Create a release from a generated manifest
   */
  async createRelease(manifest) {
    let release = await this.octokit.request(`POST /repos/${manifest.owner}/${manifest.repo}/releases`, manifest);

    if (release.status !== 201) {
      throw new Error(`Failed to create release: ${release.status}`);
    }

    return release.data;
  }

};

module.exports = GitHub;