/*
 *  Data Model for active users information
 *
 * This is probably overkill, but I wanted to learn more about Mongoose.aggregate()
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define schema
var ActiveSchema = new Schema({
      'date' : Date,
      'count' : Number
   },
   { collection : 'actives' }
);

module.exports = mongoose.model('Actives', ActiveSchema);