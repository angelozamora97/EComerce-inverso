const post_model = require('../../../../../../Ecommerce-Inverso-EComerce2/models/Post');
const commentary_model = require('../../../../../../Ecommerce-Inverso-EComerce2/models/Commentary');
const purchase_model = require('../../../../../../Ecommerce-Inverso-EComerce2/models/Purchase');
const rating_model = require('../../../../../../Ecommerce-Inverso-EComerce2/models/Rating');
const Payment = require('../../../../../../Ecommerce-Inverso-EComerce2/models/Payment');
const { Types } = require("mongoose");
var mercadopago = require('mercadopago');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
mercadopago.configure({
    sandbox: true,
    access_token: "TEST-8976970205365169-111616-1d07592cb9ad0434480cf90796242ed4-152008901"
});

const moment = require('moment')
const User = require('../../../../../../Ecommerce-Inverso-EComerce2/models/User');
moment.locale("es");
exports.getCreatePost = async(req, res, next) => {
    try {
        res.render('post/create-post');
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.postCreatePost = async(req, res, next) => {
    try {

        const body = req.body;

        const categories = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
        const newPost = new post_model({
            owner: req.user._id,
            title: body.title,
            description: body.description,
            categories: categories,
            image: body.image
        });

        await newPost.save();

        req.flash('success', { msg: 'Publicación creada' });
        res.redirect('back');
    } catch (error) {
        console.log(error);
        return next(error);
    }
};


exports.getAllPosts = async(req, res, next) => {
    try {
        const seePosts = await post_model.find({ status: 2 }).populate('owner').sort("-createdAt")
        console.log(seePosts)

        res.render('post/post-list', {
            posts: seePosts,
            moment
        });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};


exports.getMyPosts = async(req, res, next) => {
    const filters = {
        owner: req.user._id
    }
    try {
        const posts_list = await post_model.find(filters).populate('owner').sort("-createdAt")

        res.render('post/my-posts', {
            posts: posts_list
        });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getMyProposals = async(req, res, next) => {
    const query = req.query;

    const postsId = await commentary_model.find({ owner: req.user._id }).distinct("post");
    const proposals = await commentary_model.find({ owner: req.user._id }).populate('post').sort({ post: -1 });
    const clients = await User.find({ userType: "USER_ROLE" });
    const filters = {
        _id: { $in: postsId },
        id_categoria: query.id_categoria,
    }
    Object.keys(filters).forEach(key => (filters[key] === undefined || filters[key] === '') && delete filters[key])
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 5;
    const desde = (page - 1) * limit;
    try {
        const posts_list = await post_model.find(filters).populate("owner").skip(desde).limit(limit).exec();
        let count = await post_model.countDocuments(filters);
        count = Math.ceil(count / limit),

            res.render('post/my-proposals', {
                posts: posts_list,
                proposals,
                clients,
                page,
                count,
                limit
            });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};


exports.getPost = async(req, res, next) => {
    const id_post = req.params.id;
    try {
        const post = await post_model.findById(id_post);
        const comentariesZ = await commentary_model.find({ post: id_post }).populate("owner")



        const comentaries = await commentary_model.find({ price: { $gte: 0, $lte: 600 } }).explain("executionStats")

        await commentary_model.collection.createIndex({ price: 1 });

        const comentaries1 = await commentary_model.find({ price: { $gte: 0, $lte: 600 } }).hint({ price: 1 }).explain("executionStats")
            // const comentaries2 = await commentary_model.find({ price: { $gte: 100, $lte: 600 }}).hint({status:1,price:1}).explain("executionStats")
        console.log("consulta simple")
        console.log(comentaries)
        console.log("consulta comp 1")
        console.log(comentaries1)
            // console.log("consulta comp 2")
            // console.log(comentaries2)
        res.render('post/post', {
            post,
            comentaries: comentariesZ,
            moment
        })

    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.postPost = async(req, res) => {

    const id_post = req.params.id;
    const session = await mongoose.startSession();
    // const transactionOptions = {
    //     readPreference: 'primary',
    //     readConcern: { level: 'local' },
    //     writeConcern: { w: 'majority' }
    // };


    try {
        session.startTransaction();
        const post = await post_model.findById(id_post).session(session)
        if (!post) {
            console.log('El error estuvo aqui ')
            await session.abortTransaction();
            req.flash('errors', { msg: 'comentario no encontrado' })
            return res.redirect('back');
        }
        const comment = new commentary_model({
            post: id_post,
            owner: req.user._id,
            content: req.body.content,
            price: req.body.price,
            image: req.body.url_image
        })
        await comment.save({ session });
        post.comments.push(comment._id);
        await post.save({ session });

        setTimeout(async() => {
            await session.commitTransaction();
            await session.endSession();
            req.flash('success', { msg: 'Se guardo comentario' });
            res.redirect('back');
        }, 30 * 1000);

    } catch (error) {
        (await session).endSession();
        console.log(error);
        return next(error);
    }

};



exports.getAcepptedSeller = async(req, res, next) => {
    try {
        const id_commentary = req.params.id;

        const commentary = await commentary_model.findById(id_commentary).populate("owner");

        if (!commentary) {
            req.flash('errors', { msg: 'comentario no encontrado' })
            return res.redirect('back');
        }

        res.render('post/aceppted-seller', {
            commentary
        });

    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.postAcepptedSeller = async(req, res, next) => {
    try {
        const id_commentary = req.params.id;
        const body = req.body;

        const commentary = await commentary_model.findById(id_commentary);
        if (!commentary) {
            req.flash('errors', { msg: 'comentario no encontrado' })
            return res.redirect('back');
        }

        const post = await post_model.findById(commentary.post);
        if (!post) {
            req.flash('errors', { msg: 'Publicacion no encontrada' })
            return res.redirect('back');
        }

        const date = new Date();
        // const totalPrice = commentary.price*body.quantity;


        const token = body.token;
        const payment_method_id = body.payment_method_id;
        const installments = body.installments;
        const issuer_id = body.issuer_id;

        var payment_data = {
            transaction_amount: commentary.price,
            token: token,
            description: 'Compra de productos.',
            installments: parseInt(installments),
            payment_method_id: payment_method_id,
            issuer_id: issuer_id,
            payer: {
                email: req.user.email
            }
        };

        const { response } = await mercadopago.payment.save(payment_data)


        const newPayment = new Payment({
            _id: response.id,
            issuer_id: response.issuer_id,
            status: response.status,
            status_detail: response.status_detail,
            payer: req.user._id
        })


        if (response.status == 'approved') {

            const purchase = await new purchase_model({
                client: post.owner,
                seller: commentary.owner,
                amount: commentary.price,
                post: post._id,
                date: date,
                description: post.description,
                address: body.address,
                cuenta: body.cuenta,
                quantity: body.quantity,
                reference: body.reference
            });

            await purchase.save();

            newPayment.purchase = purchase._id;

            const transporter = nodemailer.createTransport({
                service: "SendinBlue",
                auth: {
                    user: "gino.cerda@unmsm.edu.pe",
                    pass: "XLRqVISMzEaKpJOm"
                },
            });
            await User.findByIdAndUpdate(req.user._id, { $addToSet: { purchases: [purchase._id] } })
            const userMailOptions = {
                to: req.user.email,
                from: 'no-reply@einverse.pe',
                subject: '¡Realizaste una compra con nosotros!',
                html: `
            <span>¡Hola!</span>
            <span>Se realizo una compra </span> 
            `
            };
            await transporter.sendMail(userMailOptions)

        } else throw new Error("Tu pago ha sido rechazado. Intenta con otra tarjeta o ponte en contacto con nosotros si el error persiste.")


        await newPayment.save();

        commentary.status = 1;
        post.status = 1;

        await post.save();
        await commentary.save();

        req.flash('success', { msg: 'Se genero la compra.' })
        res.redirect('/post/mis-compras');

    } catch (error) {
        console.log(error);
        return next(error);
    }
};



exports.getMyPurchases = async(req, res) => {
    try {

        const purchases = await purchase_model.find({ client: req.user._id }).populate("post").populate("seller").sort("-createdAt");

        res.render('post/my-purchases', {
            purchases
        })

    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getMySales = async(req, res, next) => {
    try {

        const purchases = await purchase_model.find({ seller: req.user._id }).populate('post').populate('client').populate("incidence").sort("-createdAt");
        const clients = await User.find({ userType: "USER_ROLE" });
        res.render('post/my-sales', {
            purchases,
            clients
        })

    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.putUpdateRating = async(req, res, next) => {
    try {

        const body = req.body;

        let purchase = await purchase_model.findById(req.params.id);

        const rating = new rating_model({
            seller: purchase.client,
            purchase: purchase._id,
            score: body.score
        });

        purchase.isCalificate = true;

        // console.log(purchase)
        // console.log(rating)

        await purchase.save();

        await rating.save();

        req.flash('success', { msg: 'El rating fue actualizado' })
        res.redirect('back');

    } catch (error) {
        console.log(error);
        return next(error);
    }
};