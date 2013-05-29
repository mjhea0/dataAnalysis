/**
 * getSummary.js
 * Quick App to parse signup data and active user data and generate summary information
 *
 * command line usage:  node getSummary.js <signups_file> --active <active_users_file>
 * or: node getSummary.js <signups_file> -a <active_users_file>
 * or: node getSummary.js --help
 * or: node getSummary.js -h
 *
 * Input files should be pipe-delimited, output should be tab delimited and contain:
 * month, total_signups, average_signups, median_signups
 *
 * or, with active_users_file:
 * month, total_signups, average_signups, median_signups, average_actives, median_actives
 * 
 */

// Bring in the necessary modules.
var fs = require('fs'),
   mongoose = require('mongoose');

// Connect to MongoDB using the summary database
// This is probably overkill, and I'm not using this to persist the data, but I wanted
// to learn more about the mongoose aggregate function so here we go
mongoose.connect('localhost', 'summary');

// Setup Data Models
var Signups = require('./models/signups');
var Actives = require('./models/actives');
var Result = require('./models/result');

// Helper Functions
/**
 * Simple Error handling
 * @param  {Object} error Error Object from Node
 * @return {None}       
 */
function handleErr (error) {
   console.log(error);
   process.exit(1);
}

/**
 * This function takes in a pipe delimited data file and puts it in the database
 * @param  {String}   file     File path/name of input file
 * @param  {String}   type     Type of input file, either signups or actives
 * @param  {Function} callback Sends error message or null
 * @return {Function}          Callback function
 */
function readPipeDelimited (file, type, callback) {
   if (type === 'actives') {
      // This is ugly, but for simplicity I'm not going to reuse the database
      Actives.find({}).remove().exec(function(err) {
         if (err) {
            return callback(err);
         } else {
            fs.readFile(file, function (err, data){
               if (err) {
                  handleErr(err);
               } else {
                  var numDrops = 0;
                  var lineList = data.toString().split('\n');
                  var total = lineList.length;
                  // go through each item in the array and put it in the database, except for the headers
                  for (var i=1; i<total; i++) {
                     var line = lineList[i].split('|');
                     if (typeof(line[0])!=='undefined' && typeof(line[1])!=='undefined') {
                        var active = new Actives({
                           'date' : line[0],
                           'count' : line[1].replace(/\,/g,'')
                        });
                        active.save();
                     } else {
                        numDrops++;
                     }
                     if (i==(total-1)) {
                        // this is the end
                        if (numDrops>0) {
                           console.log('Dropped ' + numDrops + ' lines from active users file due to invalid data.');
                        }
                        return callback(null);
                     }
                  }
               }
            });
         }
      });
   } else if (type === 'signups') {
      Signups.find({}).remove().exec(function(err) {
         if (err) {
            return callback(err);
         } else {
            fs.readFile(file, function (err, data){
               if (err) {
                  handleErr(err);
               } else {
                  var numDrops = 0;
                  var lineList = data.toString().split('\n');
                  var total = lineList.length;
                  // go through each item in the array and put it in the database, except for the headers
                  for (var i=1; i<total; i++) {
                     var line = lineList[i].split('|');
                     if (typeof(line[0])!=='undefined' && typeof(line[1])!=='undefined') {
                        var signup = new Signups({
                           'date' : line[0],
                           'count' : line[1].replace(/\,/g,'')
                        });
                        signup.save();
                     } else {
                        numDrops++;
                     }
                     if (i==(total-1)) {
                        // this is the end
                        if (numDrops>0) {
                           console.log('Dropped ' + numDrops + ' lines from active users file due to invalid data.');
                        }
                        return callback(null);
                     }
                  }
               }
            });
         }
      });
   } else {
      return callback('Error: what did you even do?');
   }
}

// TODO: write the results out
function writeResultFile (data, type, callback) {

   return callback(null);
}

// console.log(process.argv);

// Inspect process.argv for command line arguments, use switch to determine next steps.
// This object is an array that node generates automatically based on CLI
var args = process.argv;
switch(args[2]) {
   case '--help':
   case '-h':
      // Display a simple help screen
      var help = 'getSummary.js - Output site user statistics.\n\n';
      help    += 'Usage: node getSummary.js [file]\n';
      help    += '       node getSummary.js [file] [options]\n';
      help    += '\n';
      help    += 'Options:\n';
      help    += ' -a, --active [file]   Read an additional file with information about the \n';
      help    += '                       active site users.\n';
      help    += '\n';
      help    += 'Input Files:\n';
      help    += ' signups_file          Pipe-delimited file with dates and number of active\n';
      help    += '                       users per date.\n';
      help    += ' active_users_file     Pipe-delimited file with dates and number of active\n';
      help    += '                       users per date.\n';
      console.log(help);
      process.exit(0);
      break;
   default:
      // first check if the user also wants to use the active users statistics
      // '--active' should be in the 4th position or '-a'
      if ( typeof(args[3])!=='undefined' ) {
         // now make sure it is the right argument
         if ( args[3]==='--active' || args[3]==='-a' ) {
            if ( typeof(args[4]!=='undefined' )) {
               // user wants to inclue active user statistics
               //console.log('includes active: ', args[4]);
               readPipeDelimited(args[2], 'signups', function (err) {
                  if (err) {
                     handleErr(err);
                  } else {
                     readPipeDelimited(args[4], 'actives', function (err) {
                        if (err) {
                           handleErr(err);
                        } else {
                           // whew, data has been entered successfully
                           setTimeout(function() {
                              // TODO: Generate aggregate data
                              process.exit(0);
                           }, 1000);
                        }
                     });
                  }
               });
            } else {
               console.log('Error: must include filename for active users information.');
               process.exit(1);
            }
         } else {
            // user has entered invalid input
            console.log('Error: invalid arguments. Use --help for usage information.');
            process.exit(1);
         }
      } else {
         // use only wants signup statistics
         // console.log('Only Signups: ', args[2]);
         if ( typeof(args[2])!=='undefined' ) {
            readPipeDelimited(args[2], 'signups', function (err) {
               if (err) {
                  handleErr(err);
               } else {
                  // wait until data has been entered
                  setTimeout( function() {
                     // now generate aggregate data
                     process.exit(0);
                  }, 500);
               }
            });
         } else {
            handleErr('Error: No input file specified.');
         }
      }
      break;
}




