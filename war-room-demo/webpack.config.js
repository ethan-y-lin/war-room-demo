const path = require('path');

module.exports = [
  // Configuration for the server-side code

  // Configuration for the client-side code
  {
    mode: 'development',
    entry: './src/public/javascripts/index.js',
    output: {
      path: path.resolve(__dirname, 'dist/public/js'),
      filename: 'app.bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        }
      ]
    }
  }
];
