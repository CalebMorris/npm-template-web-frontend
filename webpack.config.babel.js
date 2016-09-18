/* eslint-disable no-param-reassign, no-console */
import fs from 'fs';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';

const sourceBase = './src/';

const jsRegex = new RegExp(/\.js$/i);
const cssRegex = new RegExp(/\.s?css$/i);
const htmlRegex = new RegExp(/\.html$/i);
const entryRegex = [jsRegex, cssRegex];

function isEntry(stats, file) {
  if (!file || typeof file !== 'string') throw new Error('Missing `file`');
  if (!stats) throw new Error('Missing `stats`');
  return stats.isFile() && entryRegex.reduce((memo, regex) => memo || regex.test(file), false);
}

function isHTMLFile(stats, file) {
  if (!file || typeof file !== 'string') throw new Error('Missing `file`');
  if (!stats) throw new Error('Missing `stats`');
  return stats.isFile() && htmlRegex.test(file);
}

function createHtmlPageFromFile(filename, filepath) {
  return new HtmlWebpackPlugin({
    filename: `../${filename}`,
    template: filepath,
  });
}

function getFileTypesFromDir(basePath, statFilters) {
  if (! basePath || typeof basePath !== 'string') throw new Error('Missing `basePath`');
  if (! statFilters) throw new Error('Missing `statFilters`');
  const files = fs.readdirSync(basePath);
  let isSingle = true;
  let results;
  if (Array.isArray(statFilters)) {
    isSingle = false;
    results = {};
    statFilters.forEach((filterWithName) => {
      if (typeof filterWithName !== 'function' || typeof filterWithName.name === 'undefined') {
        throw new Error(`Invalid function  [${JSON.stringify(filterWithName)}]`);
      }
      results[filterWithName.name] = [];
    });
  } else {
    results = [];
  }

  return files.reduce((memo, file) => {
    const currentPath = path.join(basePath, file);
    const stats = fs.statSync(currentPath);
    if (! stats) {
      throw new Error(`Unable to load stats for [${currentPath}]`);
    }

    if (isSingle) {
      if (statFilters(stats, file)) {
        memo.push(file);
      }
    } else {
      statFilters.forEach((filter) => {
        if (filter(stats, file)) {
          memo[filter.name].push(file);
        }
      });
    }

    return memo;
  }, results);
}

let htmlPages = [];
const extractCSS = new ExtractTextPlugin('[name].[hash].scss');
const webpageEntries = getFileTypesFromDir(sourceBase, (stats) => stats.isDirectory())
  .reduce((memo, dirName) => {
    const currentPath = path.join(sourceBase, dirName);
    console.log(`checking dir: [${currentPath}]`);
    const filteredFiles = getFileTypesFromDir(currentPath, [isEntry, isHTMLFile]);

    console.log(`HTMLPages: ${JSON.stringify(filteredFiles[isHTMLFile.name])}`);
    console.log(`webpageEntries: ${JSON.stringify(filteredFiles[isEntry.name])}`);

    memo[dirName] = filteredFiles[isEntry.name]
      .map((file) => `./${path.join(currentPath, file)}`);
    htmlPages = htmlPages.concat(
      filteredFiles[isHTMLFile.name]
        .map((file) => createHtmlPageFromFile(file, path.join(currentPath, file)))
    );

    return memo;
  }, {});

module.exports = {
  module: {
    loaders: [
      {
        test: jsRegex,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel?presets[]=es2015',
      },
      {
        test: cssRegex,
        loader: ExtractTextPlugin.extract(['css','sass']),
      },
    ],
  },
  entry: webpageEntries,
  output: {
    path: path.join(__dirname, 'dist', 'assets'),
    filename: '[name].[hash].js',
    publicPath: 'assets/',
  },
  plugins: [
    ...htmlPages,
    extractCSS,
  ],
};
