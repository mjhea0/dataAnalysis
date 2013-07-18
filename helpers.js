/**
 * helpers.js - methods to assist in processing files and data
 */

// Bring in the necessary modules.
var fs = require('fs'),
   mongoose = require('mongoose');

// Setup Data Models
var Input = require('./models/input');
var Result = require('./models/result');


/**
 * median is a simple function to find the median in an array of numbers
 * I initially thought mongoose.aggregate() would provide this, but oh well
 * @param  {Array}  values An array of numbers
 * @return {Integer}        The median. If array.length is even, this is avg
 *                          of middle two numbers, rounded to nearest int
 */
function median(values) {
   values.sort( function(a,b) {return a-b;});
   var half = Math.floor(values.length/2);
   if(values.length % 2) {
      return values[half];
   } else {
      return Math.round((values[half-1]+values[half])/2);
   }
}

/**
 * createResult takes the ObjectId of a dataset input document and uses Mongoose
 * aggregate() to compile the resulting data as specified in the data challenge
 * @param  {String}   inputId  ObjectId of dataset input document
 * @param  {Function} callback Sends error message and/or result array ready for writing
 * @return {Function}            Callback Function
 */
function createResult (inputId, type, callback) {
   // create an aggregation pipeline
   var aggPipe = [];
   // do the following for every input file because we know it has at least signups data
   aggPipe.push({ '$match' : { '_id' : inputId }});
   aggPipe.push({ '$unwind' : '$signups' });
   aggPipe.push({ '$project': {
         'signupMonth' : { '$month' : '$signups.date' },
         'signups' : '$signups.count'
      }});
   aggPipe.push({ '$group' : {
      '_id' : { 'month' : '$signupMonth'},
      'total_signups' : {
         '$sum' : '$signups'
      },
      'average_signups' : {
         '$avg' : '$signups'
      },
      'dailySignups' : {
         '$push' : '$signups'
      }
   }});
   aggPipe.push({ '$project' : {
      'month' : '$_id.month',
      'total_signups' : 1,
      'average_signups': 1,
      'dailySignups': 1,
      '_id' : 0
   }});
   aggPipe.push({ '$sort' : { 'month' : 1}});

   // Now run the aggregation and operate on the resulting array
   Input.aggregate(aggPipe, function (err, data) {
      if (err) {
         callback(err, null);
      } else {
         // Now we have signups data, we need to get medians (darn you mongo)
         var totRows = data.length;
         var sResult = [];
         for (var i=0; i< totRows; i++) {
            var thisMedian = median(data[i].dailySignups);
            sResult[i] = {
               'month' : data[i].month,
               'total_signups' : data[i].total_signups,
               'average_signups' : data[i].average_signups,
               'median_signups' : thisMedian
            };
            if (i==(totRows-1)) {
               if (type==='signups') {
                  var logResult = new Result({
                     'type' : 'signups',
                     'input' : inputId,
                     'lines' : sResult
                  });
                  logResult.save(function(err) {
                     if (err) {
                        // storing the result is not a requirement, just an extra
                        console.log('FYI - Result not saved to database.');
                     }
                     callback(null, sResult);
                  });
               } else {
                  // Keep going, we need to get data on user activity
                  // create aggregation pipeline for 'actives'
                  var newAgg = [];
                  newAgg.push({ '$match' : { '_id' : inputId }});
                  newAgg.push({ '$unwind' : '$actives' });
                  newAgg.push({ '$project': {
                        'activeMonth' : { '$month' : '$actives.date' },
                        'actives' : '$actives.count'
                     }});
                  newAgg.push({ '$group' : {
                     '_id' : { 'month' : '$activeMonth'},
                     'average_actives' : {
                        '$avg' : '$actives'
                     },
                     'dailyActives' : {
                        '$push' : '$actives'
                     }
                  }});
                  newAgg.push({ '$project' : {
                     'month' : '$_id.month',
                     'average_actives': 1,
                     'dailyActives': 1,
                     '_id' : 0
                  }});
                  newAgg.push({ '$sort' : { 'month' : 1}});
                  // Now run the aggregation and return the resulting array
                  Input.aggregate(newAgg, function (err, aData) {
                     if (err) {
                        callback(err, null);
                     } else {
                        // Now we have signups data, we need to get medians (darn you mongo)
                        var totalRows = aData.length;
                        var combined = [];
                        for (var j=0; j< totalRows; j++) {
                           var thisMed = median(aData[j].dailyActives);
                           combined[j] = {
                              'month' : aData[j].month,
                              'average_actives' : aData[j].average_actives,
                              'median_actives' : thisMed
                           };
                           for (var k=0; k<sResult.length; k++) {
                              if (sResult[k].month==combined[j].month) {
                                 combined[j].total_signups = sResult[k].total_signups;
                                 combined[j].average_signups = sResult[k].average_signups;
                                 combined[j].median_signups = sResult[k].median_signups;
                              }
                              if (j==(totalRows-1) && k==(sResult.length-1)) {
                                 var cmbResult = new Result({
                                    'type' : 'actives',
                                    'input' : inputId,
                                    'lines' : combined
                                 });
                                 cmbResult.save(function(err) {
                                    if (err) {
                                       // storing the result is not a requirement, just an extra
                                       console.log('FYI - Result not saved to database.');
                                    }
                                    callback(null, combined);
                                 });
                              }
                           }
                        }
                     }
                  });
               }
            }
         }
      }
   });
}

module.exports = {
   /**
    * This function takes in a pipe delimited data file and returns an array of entries
    * @param  {String}   file     File path/name of input file
    * @param  {Function} callback Sends error message, entities array, and number of drops
    * @return {Function}          Callback function
    */
   readPipeDelimited: function (file, callback) {
      var data;
      // first, read the file and create an array with 1 line = 1 item
      try {
         data = fs.readFileSync(file);
         var numDrops = 0;
         var lineList = data.toString().split('\n');
         var total = lineList.length;
         var entities = [];

         // go through each item in the input array and put it in the entities array
         for (var i=1; i<total; i++) {
            var line = lineList[i].split('|');
            if (typeof(line[0])!=='undefined' && typeof(line[1])!=='undefined') {
               entities.push({
                  'date' : line[0],
                  'count' : line[1].replace(/\,/g,'')
               });
            } else {
               numDrops++;
            }
            if (i==(total-1)) {
               // this is the end
               if (numDrops>0) {
                  console.log('Dropped ' + numDrops + ' lines from ' + file + ' due to invalid data.');
               }
               callback(null, entities, numDrops);
            }
         }
      } catch (err) {
         callback(err, null, null);
      }
   },

   /**
    * ingestSignups takes an array of signup data and a count of dropped entries and
    * creates a new input document in the database
    * @param  {Object}   signups        Array of signup data entries
    * @param  {Number}   droppedSignups Number of dropped records during file read
    * @param  {Function} callback       Sends Error message and/or ObjectId of document
    * @return {Function}                  Callback Function
    */
   ingestSignups: function (signups, droppedSignups, callback) {
      var input = new Input({
         'type' : 'signups',
         'droppedSignups': droppedSignups,
         'signups' : signups
      });
      input.save(function (err) {
         if (err) {
            callback(err, null);
         } else {
            callback(null, input._id);
         }
      });
   },

   /**
    * ingestBoth takes arrays of signups and actives and counts of dropped entires
    * and creates a new input document in the database
    * @param  {Object}   signups        Array of signup data entries
    * @param  {Number}   droppedSignups Number of dropped records during file read
    * @param  {Object}   actives        Array of active user data entries
    * @param  {Number}   droppedActives Number of dropped records during file read
    * @param  {Function} callback       Sends Error message and/or ObjectId of document
    * @return {Function}                  Callback Function
    */
   ingestBoth: function (signups, droppedSignups, actives, droppedActives, callback) {
      var input = new Input({
         'type' : 'actives',
         'droppedSignups': droppedSignups,
         'droppedActives': droppedActives,
         'signups' : signups,
         'actives' : actives
      });
      input.save(function (err) {
         if (err) {
            callback(err, null);
         } else {
            callback(null, input._id);
         }
      });
   },

   /**
    * writeResultFile is called from the main switch of the script and is passed the
    * ObjectId of a newly created input record in the database. This function will 
    * get a result dataset from createResult, write it to a tab delimited file, then
    * return the filename to the main script
    * @param  {String}   inputId  ObjectId of dataset input document
    * @param  {Function} callback Sends error message and/or result file name
    * @return {Function}            Callback Function
    */
   writeResultFile: function (inputId, type, callback) {
      var file = 'output.txt';

      createResult(inputId, type, function (err, result) {
         if (err) {
            callback(err, null);
         } else {
            var contents = '';
            if (type==='signups') {
               // now write the file with signups data and return filename
               contents += 'month\ttotal_signups\taverage_signups\tmedian_signups\n';
               result.forEach(function(line, i) {
                  contents += line.month + '\t' + line.total_signups + '\t';
                  contents += line.average_signups + '\t' + line.median_signups + '\n';
                  if (i==(result.length-1)) {
                     try {
                        fs.writeFileSync(file, contents);
                        callback(null, file);
                     } catch (err) {
                        callback(err, null);
                     }
                  }
               });
            } else {
               // now write the file with signups and actives data and return filname
               contents += 'month\ttotal_signups\taverage_signups\tmedian_signups\taverage_actives\tmedian_actives\n';
               result.forEach(function(line, i) {
                  contents += line.month + '\t' + line.total_signups + '\t';
                  contents += line.average_signups + '\t' + line.median_signups + '\t';
                  contents += line.average_actives + '\t' + line.median_actives + '\n';
                  if (i==(result.length-1)) {
                     try {
                        fs.writeFileSync(file, contents);
                        callback(null, file);
                     } catch (err) {
                        callback(err, null);
                     }
                  }
               });
            }
         }
      });
   }
};