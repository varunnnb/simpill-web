const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  time: { type: String, required: true },
  frequency: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastTaken: { type: Date, default: null }
});

module.exports = mongoose.model('Medication', medicationSchema);