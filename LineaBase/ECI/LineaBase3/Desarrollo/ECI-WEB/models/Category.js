const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, "El nombre es obligatorio"] },
  detail: String,
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;