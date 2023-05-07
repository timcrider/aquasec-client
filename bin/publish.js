require('dotenv-expand').expand(require('dotenv').config());
const {Octokit} = require('octokit');
const {program, Option} = require('commander');
const GitHub  = require('../src/dev/github');

const dumper = (data) => { console.log(JSON.stringify(data, null, 2)); };
const octo = new Octokit({auth: process.env.GITHUB_TOKEN});
const gh = new GitHub(octo);

program
  .description('Publish a new tag and release to GitHub')
  .addOption(new Option('-o, --owner <owner>', 'Repository owner').env('GITHUB_OWNER'))
  .addOption(new Option('-r, --repo <repo>', 'Repository name').env('GITHUB_REPO'))
  .addOption(new Option('-b, --branch <branch>', 'Branch to publish').default('main').env('GITHUB_BRANCH'))
  .addOption(new Option('-v, --version <version>', 'Version to publish'))
  .addOption(new Option('-m, --message <message>', 'Release message'));

program.parse(process.argv);
let opts = program.optsWithGlobals();

// Validate options
if (opts.owner === "" || opts.owner === undefined) {
  console.error('Repository owner is required');
  process.exit(1);
}

if (opts.repo === "" || opts.repo === undefined) {
  console.error('Repository name is required');
  process.exit(2);
}

if (opts.version === "" || opts.version === undefined) {
  opts.version = require('../package.json').version;
}

if (opts.message === "" || opts.message === undefined) {
  opts.message = `Release ${opts.version}`;
}

if (opts.branch === "" || opts.branch === undefined) {
  opts.branch = main;
}


(async () => {
  console.log('Beginning Pre-Flight Checks');
  let releaseExists = null;
  let tagExists = null;
  let remoteHash = null;

  // Check for existing release
  console.log(`   Checking for existing release ${opts.version}`);
  let release = await gh.getReleases(opts.owner, opts.repo, opts.version);

  if (release.length > 0) {
    console.error(`      - Release ${opts.version} already exists`);
    process.exit(3);
  }
  console.log(`      + Release ${opts.version} does not exist`);

  // Check for existing tag
  console.log(`   Checking for existing tag ${opts.version}`);
  let tag = await gh.getTags(opts.owner, opts.repo, opts.version);

  if (tag.length > 0) {
    console.error(`      - Tag ${opts.version} already exists`);
    process.exit(4);
  }
  console.log(`      + Tag ${opts.version} does not exist`);

  // Fetching existing remote hash for branch
  console.log(`   Fetching remote hash for ${opts.branch}`);
  remoteHash = await gh.fetchRemoteBranchSha(opts.owner, opts.repo);

  if (remoteHash === "") {
    console.error(`      - Remote hash for ${opts.branch} is empty`);
    process.exit(5);
  }
  console.log(`      + Remote hash for ${opts.branch} is ${remoteHash}`);

  // Fetch remote package.json from main branch
  console.log(`   Fetching remote package.json from ${opts.branch}`);
  let remotePackage = await gh.fetchRemotePackage(opts.owner, opts.repo, opts.branch);

  if (remotePackage === "") {
    console.error(`      - Remote package.json for ${opts.branch} is empty`);
    process.exit(6);
  }
  console.log(`     + Remote package.json for ${opts.branch} is not empty and shows version ${remotePackage.version}`);

  // Currently limit to publishing the same version as the package.json locally
  if (remotePackage.version !== opts.version) {
    console.error(`      - Remote package.json version ${remotePackage.version} does not match ${opts.version}`);
    process.exit(7);
  }
  console.log(`      + Remote package.json version ${remotePackage.version} matches ${opts.version}`);

  let releaseData = {
    owner: opts.owner,
    repo: opts.repo,
    tag_name: opts.version,
    target_commitish: remoteHash,
    name: `Relese ${opts.version}`,
    body: opts.message,
    draft: false,
    prerelease: true,
    generate_release_notes: false
  };

  let result = await gh.createRelease(releaseData);

  console.log('Release Created');
})();
