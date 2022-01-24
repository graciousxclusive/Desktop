const fs = require('fs');
const _ = require('underscore');
const readline = require('readline');
const { google } = require('googleapis');
const dotenv = require('dotenv');

const mongoose = require('mongoose');
const Teaching = require('./models/teachingsModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  'PASSWORD',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => console.log('Database connected successfully'));

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  drive.files.list(
    {
      //singles
      q: "parents = '1Uch60FcmVCxEcqQnt3Y7QpEhsevmfT3L'",
      pageSize: 800,
      fields:
        'nextPageToken, files(id, name, description, webContentLink, parents, mimeType)',
    },
    (err, res) => {
      if (err) return console.log(`The API returned an error: ${err}`);
      const { files } = res.data;
      if (files.length) {
        for (let i = 0; i < files.length; i += 1) {
          // console.log(year);
          // console.log('pepper dem');
          if (typeof files[i].description !== 'undefined') {
            const year = files[i].description.slice(-4);
            console.log(year);
            const teaching = new Teaching({
              Teaching: {
                Title: files[i].name,
              },
              Year: year,
            });
            // console.log('Files:------------------', teaching);

            drive.files.list(
              {
                q: `parents= '${files[i].id}'`,
                fields: 'nextPageToken, files(name, webContentLink)',
              },
              (error, response) => {
                if (error)
                  return console.log(`The API returned an error: ${err}`);
                // const hasDescription = _.where(files, {
                //   parents: `'${files[i].id}'`,
                // });
                // console.log(hasDescription);
                const files2 = response.data.files;
                if (files2.length) {
                  // console.log(files2);
                  teaching.Teaching.Tracks = files2;
                  console.log(teaching);
                  const importData = async () => {
                    try {
                      await Teaching.create(teaching);
                      console.log('Data imported with success');
                    } catch (er1) {
                      console.log(er1);
                    }
                  };

                  if (process.argv[2] === '--import') {
                    importData();
                  }
                }
              }
            );
          }
        }
      } else {
        console.log('No files found.');
      }

      const deleteData = async () => {
        try {
          await Teaching.deleteMany();
          console.log('Successfully nuked our data');
          process.exit();
        } catch (er2) {
          console.log(er2);
        }
      };

      if (process.argv[2] === '--delete') {
        deleteData();
      }
    }
  );
}
