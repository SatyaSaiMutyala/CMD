module.exports = {
  preset: '@react-native/jest-preset',
  // React Navigation and the Redux packages ship untranspiled ES modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[^/]+)?|@react-native(-community|-async-storage)?|@react-navigation|@reduxjs/toolkit|react-redux|redux|redux-thunk|reselect|immer)/)',
  ],
};
