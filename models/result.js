/*
 *  Data Model for active users information
 *
 * type can be 'signups' or 'combo'
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define schema
// month, total_signups, average_signups, median_signups, average_actives, median_actives
var ResultSchema = new Schema({
      'created' : { type: Date, default: Date.now },
      'type' : String,
      'lines' : [{
         'month' : Number,
         'total_signups' : Number,
         'average_signups' : Number,
         'median_signups' : Number,
         'average_actives' : Number,
         'median_actives' : Number
      }]
   },
   { collection : 'results' }
);

module.exports = mongoose.model('Result', ResultSchema);