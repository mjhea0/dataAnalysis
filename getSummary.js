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
// This is probably overkill, but I wanted to learn more about the
// mongoose aggregate function so here we go
try {
   mongoose.connect('localhost', 'summary');
} catch (err) {
   console.log('Are you sure you have mongod running on localhost? Because node says:');
   console.log(err.message);
   process.exit(1);
}

// Setup Data Models
var Input = require('./models/input');
var Result = require('./models/result');

// Helper Functions
var help = require('./helpers');

/**
 * Simple Error handling
 * @param  {Object} error Error Object from Node
 * @return {None}       
 */
function handleErr (error) {
   // in the event of a real application, this would be more complete
   console.log(error.message);
   process.exit(1);
}

/**
 * And now down to business
 */
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
      help    += ' signups               Pipe-delimited file with dates and number of signups\n';
      help    += '                       per date.\n';
      help    += ' active_users          Pipe-delimited file with dates and number of active\n';
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
               help.readPipeDelimited(args[2], function (err, signups, droppedSignups) {
                  if (err) {
                     handleErr(err);
                  } else {
                     help.readPipeDelimited(args[4], function (err, actives, droppedActives) {
                        if (err) {
                           handleErr(err);
                        } else {
                           help.ingestBoth(signups, droppedSignups, actives, droppedActives, function(err, inputId){
                              if (err) {
                                 handleErr(err);
                              } else {
                                 help.writeResultFile(inputId, 'actives', function (err, fileName) {
                                    if (err) {
                                       handleErr(err);
                                    } else {
                                       console.log('Output successfully generated, stored in: ' + fileName);
                                       // Maybe tell them about the database record?
                                       process.exit(0);
                                    }
                                 });
                              }
                           });
                        }
                     });
                  }
               });
            } else {
               handleErr({ 'message': 'Error: must include filename for active users information.'});
            }
         } else {
            // user has entered invalid input
            handleErr({'message' : 'Error: invalid arguments. Use --help for usage information.'});
         }
      } else {
         // use only wants signup statistics
         // console.log('Only Signups: ', args[2]);
         if ( typeof(args[2])!=='undefined' ) {
            help.readPipeDelimited(args[2], function (err, signups, droppedSignups) {
               if (err) {
                  handleErr(err);
               } else {
                  help.ingestSignups(signups, droppedSignups, function(err, inputId){
                     if (err) {
                        handleErr(err);
                     } else {
                        help.writeResultFile(inputId, 'signups', function (err, fileName) {
                           if (err) {
                              handleErr(err);
                           } else {
                              console.log('Output successfully generated, stored in: ' + fileName);
                              // Maybe tell them about the database record?
                              process.exit(0);
                           }
                        });
                     }
                  });
               }
            });
         } else {
            handleErr({'message' : 'Error: No input file specified. Use -h for assistance.'});
         }
      }
      break;
}




