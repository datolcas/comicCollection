const mongoose = require('mongoose');

const lecturaSchema = new mongoose.Schema({
  comic: { type: mongoose.Schema.Types.ObjectId, ref: 'Comic', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true });

module.exports = mongoose.model('Lectura', lecturaSchema);
