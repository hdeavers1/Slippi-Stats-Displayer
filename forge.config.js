const githubToken = process.env.GITHUB_TOKEN;

module.exports = {
  packagerConfig: {
    icon: 'src/images/icon/DK-2.ico',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
  publish: [
    {
      name: '@electron-forge/publish-github',
      config: {
        repository: {
          owner: 'hdeavers1',
          name: 'Slippi-Stats-Display'
        },
        authToken: githubToken,
      }
    }
  ]
};
