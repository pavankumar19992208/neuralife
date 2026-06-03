const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

let exclusionList;
try {
  exclusionList = require('metro-config/src/defaults/exclusionList');
} catch {
  exclusionList = null;
}

const blockPatterns = [
  /.*\/android\/build\/.*/,
  /.*\/android\/\.gradle\/.*/,
  /.*\/ios\/build\/.*/,
  /.*\/\.gradle\/.*/,
];

// CRITICAL: force a SINGLE copy of react / react-native / scheduler.
// The monorepo has two React versions (18.2.0 for mobile, 18.3.1 for web).
// Without this, Metro can bundle a second React via a transitive dep, creating
// duplicate module registries → AppRegistry "not registered" / broken hooks /
// blank screen. These aliases pin every import to mobile's single 18.2.0 copy.
const singletons = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
  scheduler: path.resolve(projectRoot, 'node_modules/scheduler'),
};

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: singletons,
    unstable_enablePackageExports: false,
    ...(exclusionList ? {blockList: exclusionList(blockPatterns)} : {}),
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
