/*
 *  Data Model for data inputs
 *
 * This is probably overkill, but I wanted to learn more about Mongoose.aggregate()
 *
 * type can be 'signups' or 'actives' (where actives means both types are included)
 * 
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Subdocs for User Data
var Entries = new Schema({
      'date' : Date,
      'count' : Number
   });

// Define schema
var InputSchema = new Schema({
      'created' : { type: Date, default: Date.now },
      'type' : String,
      'droppedSignups': Number,
      'droppedActives': Number,
      'signups' : [Entries],
      'actives' : [Entries]
   },
   { collection : 'inputs' }
);

module.exports = mongoose.model('Input', InputSchema);