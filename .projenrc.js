const { awscdk } = require('projen');
const { GithubCredentials } = require('projen/lib/github');
const { NpmAccess } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Matthew Rawlings',
  authorAddress: 'contact@matthewrawlings.com',
  cdkVersion: '2.127.0',
  defaultReleaseBranch: 'main',
  name: 'texit-constructs',
  testdir: '',
  gitignore: ['.vscode'],
  npmAccess: NpmAccess.PUBLIC,
  releaseToNpm: true,
  autoApproveUpgrades: true,
  autoApproveOptions: {
    allowedUsernames: ['awlsring'],
    secret: 'GITHUB_TOKEN',
  },
  repositoryUrl: 'https://github.com/awlsring/texit-constructs.git',
  githubOptions: {
    projenCredentials: GithubCredentials.fromPersonalAccessToken(
      'PROJEN_GITHUB_TOKEN',
    ),
  },
});
project.synth();
