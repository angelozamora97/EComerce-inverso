const mongoose = require('mongoose');

const commentarySchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post"},
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, required: [true, "El contenido es obligatorio"] },
  price: { type: Number, required: [true, "El precio es obligatorio"] },
  status: { type: Number, default: 0 },
  image: String
}, { timestamps: true });

const Commentary = mongoose.model('Commentary', commentarySchema);

module.exports = Commentary;


