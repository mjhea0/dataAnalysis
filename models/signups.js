/*
 *  Data Model for user signups information
 *
 * This is probably overkill, but I wanted to learn more about Mongoose.aggregate()
 *
 * For example, a more efficient way to store this would be to have an array of objects
 * called "entries" that had a date and count. But that wouldn't let me use aggregate()
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define schema
var SignupSchema = new Schema({
      'date' : Date,
      'count' : Number
   },
   { collection : 'signups' }
);

module.exports = mongoose.model('Signups', SignupSchema);