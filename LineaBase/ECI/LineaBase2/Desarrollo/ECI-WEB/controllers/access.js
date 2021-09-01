const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const _ = require('lodash');
const validator = require('validator');
const mailChecker = require('mailchecker');
const User = require('../models/User');
const mongoose = require('mongoose');
const { session } = require('passport');
const randomBytesAsync = promisify(crypto.randomBytes);

exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('access/signup');
};

exports.postSignup = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Ingresa un email válido.' });
  if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'La contraseña debe tener al menos 8 caracteres' });
  if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Las contraseñas no coinciden.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/registro');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  let user = new User({
    email: req.body.email,
    password: req.body.password,
  });
  
  user.profile = {
    name: req.body.name,
    account: req.body.account
  };
  user.userType= req.body.userType

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Ya existe una cuenta con ese correo' });
      return res.redirect('/registro');
    }
    user.save((err) => {
      if (err) { return next(err); }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        if(user.userType=="USER_ROLE"){
          res.redirect('/post/mis-publicaciones');
        }
        if(user.userType=="SELLER_ROLE"){
          res.redirect('/post/mis-propuestas');
        }
      });
    });
  });
};

exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('access/login');
};

exports.postLogin = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Ingrese un email valido' });
  if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'La contraseña está vacía' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/login');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Bienvenido!' });
      if(user.userType=="USER_ROLE"){
        res.redirect('/post/mis-publicaciones');
      }
      if(user.userType=="SELLER_ROLE"){
        res.redirect('/post/mis-propuestas');
      }
      if(user.userType=="ADMIN_ROLE"){
        res.redirect('/administrador/panel');
      }
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Error al destruir la sesión, intente de nuevo en unos minutos.', err);
    req.user = null;
    res.redirect('/');
  });
};

exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('access/forgot');
};

exports.postForgot = async (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Ingresa un email válido.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/recuperar');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  const user = await User.findOne({email:req.body.email})
  const session = await mongoose.startSession()
  session.startTransaction()
  if(user){
    try {
        const ops  = {session, new: true}
        let token ="123123123";
        let exp = Date.now() + 3600000;
        let update = await user.updateOne({passwordResetToken:token, passwordResetExpires:exp}, ops)
        if(update){
          try{
            let transporter = nodemailer.createTransport({
              service: 'SendinBlue',
              auth: {
                user: process.env.SENDINBLUE_USER,
                pass: process.env.SENDINBLUE_PASSWORD
              }
            });
            const mailOptions = {
              to: user.email,
              from: 'no-reply@einverse.pe',
              subject: 'Reinicia tu contraseña de Ecommerce-inverse',
              text: `Hola, ingresa al siguiente link para cambiar tu password:\n\n
                http://${req.headers.host}/reset/${token}\n\n`
            };
            await transporter.sendMail(mailOptions)
            await session.commitTransaction();
            session.endSession();
            console.log(session)
            console.log('El mensaje se ha enviado correctamente')
            req.flash('success', { msg: 'El mensaje se ha enviado correctamente' });
            res.redirect('back');
          }catch(error){
            await session.abortTransaction();
            session.endSession();
            console.log(error);
            req.flash('errors', { msg: 'Fallo al enviar el mensaje' });
            res.redirect('back');
          }
        }   
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      req.flash('errors', { msg: error });
      res.redirect('back');
    }
  }else{
    await session.abortTransaction();
    session.endSession();

    req.flash('errors', { msg: 'Email no encontrado' });
    res.redirect('back');
  }
}

exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  const validationErrors = [];
  if (!validator.isHexadecimal(req.params.token)) validationErrors.push({ msg: 'Enlace inválido, por favor reintente.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/recuperar');
  }

  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'El enlace ha expirado.' });
        return res.redirect('/recuperar');
      }
      res.render('access/reset');
    });
};

exports.postReset = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'La contraseña debe tener al menos 8 caracteres.' });
  if (req.body.password !== req.body.confirm) validationErrors.push({ msg: 'Las contraseñas no coinciden.' });
  if (!validator.isHexadecimal(req.params.token)) validationErrors.push({ msg: 'Enlace inválido, por favor reintentar.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'El enlace ha expirado.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    let transporter = nodemailer.createTransport({
      service: 'SendinBlue',
      auth: {
        user: process.env.SENDINBLUE_USER,
        pass: process.env.SENDINBLUE_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'no-reply@starter.pe',
      subject: 'Tu contraseña se ha actualizado.',
      text: `Confirmacion de que la contraseña de ${user.email} ha sido actualizada.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Contraseña actualizada!' });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendinBlue',
            auth: {
              user: process.env.SENDINBLUE_USER,
              pass: process.env.SENDINBLUE_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', { msg: 'Contraseña Actualizada!' });
            });
        }
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', { msg: 'Tu contraseña se ha actualizado, pero no se pudo enviar la constancia por mail..' });
        return err;
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/'); })
    .catch((err) => next(err));
};
