const express = require('express');
// const app = express();

//Modelos
const mongoose = require("mongoose");
const postmodel = require('../models/Post');
const incidenciamodel = require('../models/Incidence');
const usuarioModel = require('../models/User');
const purchase_model = require('../models/Purchase');
const moment =  require('moment')
exports.getCreateIncidence = async(req, res) => {
  const id_user = req.user._id;
  try {
    const purchases = await purchase_model.find({client:id_user}).populate('post');
    return res.render('incidence/create-incidence',{
      purchases
    })
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

exports.postCreateIncidence = async(req, res, next) => {
  const body = req.body;
  const id_purchase = body.purchase;
  try {
    const purchaseEncontrado = await purchase_model.findById(mongoose.Types.ObjectId(id_purchase));
    if (!purchaseEncontrado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Compra no encontrada',
      });
    }
    const admin = await usuarioModel.findOne({userType:'ADMIN_ROLE'})
    const currentdate = new Date()
    const newIncidence = new incidenciamodel({
      admin: admin._id,
      client: req.user._id,
      seller: purchaseEncontrado.seller,
      type: body.type,
      date: currentdate,
      post: purchaseEncontrado.post,
      description: body.description
    });
    newIncidence.save();

    req.flash('success',{msg: 'Incidencia creada'})
    return res.redirect('back');

  } catch (error) {
    console.log(error);
    return next(error);
  }
};
//obtener incidencias de un usuario

exports.getMyIncidences =  async(req, res) => {
  try {
    const filters = {
      client: req.user._id,
    }
    const incidenciasEncontradas = await incidenciamodel.find(filters).populate("post").populate("seller").populate("client")
    console.log(incidenciasEncontradas)
    return res.render('incidence/my-incidences',{
      incidencias: incidenciasEncontradas
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error en la base de datos',
      error
    });
  }
};
//obtener detalle de incidencia
exports.getIncidence = async(req, res,next) => {
  const id_incidencia = req.params.id;
  try {
    const incidenciaEncontrada = await incidenciamodel.findById(id_incidencia)
                                                      .populate('admin')
                                                      .populate('seller')
                                                      .populate('post')
                                                      .populate('client');
    return res.render('incidence/incidence',{
      incidence: incidenciaEncontrada,
      moment
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};