const post_model = require('../models/Post');


exports.index = async(req, res, next) => {
  try {
    const foods = await post_model.countDocuments({categories: {$in: 'Alimentos'}})
    const shoes = await post_model.countDocuments({categories: {$in: 'Calzado'}})
    const clothes = await post_model.countDocuments({categories: {$in: 'Ropa'}})
    const services = await post_model.countDocuments({categories: {$in: 'Servicio'}})
    return res.render('index',{foods, shoes, clothes, services});
  } catch (error) {
      console.log(error);
      return next(error);
  }
};