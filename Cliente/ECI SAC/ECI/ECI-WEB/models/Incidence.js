const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const incidenceSchema = new Schema({

  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type:  { type: String, required: [true, "El tipo es requerido"] },
  date:  { type: Date, required: [true, "El dia de es requerido"] },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
  description:  { type: String, required: [true, "La descripcion es requerida"] },

},{ timestamps: true });


const Incidence = mongoose.model("Incidence", incidenceSchema);
module.exports=Incidence;