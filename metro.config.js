const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// Get the root of the monorepo
const workspaceRoot = path.resolve(__dirname);
const projectRoot = __dirname;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Watch all files in the monorepo
  watchFolders: [workspaceRoot],
  resolver: {
    // Allow metro to resolve modules from the root node_modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Ensure we don't run into issues with duplicate dependencies
    disableHierarchicalLookup: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);