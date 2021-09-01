const express = require('express');
const app = express();

const incidence_model = require('../models/Incidence');
const user_model = require('../models/User');
const post_model = require('../models/Post')

exports.getPanel = async(_req, res, next) => {
    try {
        return res.render('admin/panel');
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getSellers = async(_req, res, next) => {
    try {
        const filters = { userType: 'SELLER_ROLE' }
        const seller_list = await user_model.find(filters);

        return res.render('admin/sellers-list', {
            seller_list: seller_list,
        });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getClients = async(req, res) => {
    try {
        const filters = { userType: 'USER_ROLE' }
        const clients_list = await user_model.find(filters);

        return res.render('admin/clients-list', {
            ok: true,
            clients_list,
        });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getIncidences = async(_req, res, next) => {
    try {
        const filters = { userType: 'USER_ROLE' }
        const proposals = await incidence_model.find().populate("client").populate("seller");
        const clients_list = await user_model.find(filters);

        console.log(proposals)
        return res.render('admin/incidences', {
            ok: true,
            proposals,
            clients: clients_list
        });
    } catch (error) {
        console.log(error);
        return next(error);
    }
};

exports.getPosts = async(req, res, next) => {
    try {
        const posts = await post_model.find({ status: 0 }).sort({ createdAt: -1 }).populate('owner')

        return res.render('admin/posts', {
            posts: posts,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
}

exports.getPost = async(req, res, next) => {
    try {
        const { params } = req
        const post = await post_model.findById(params.id).populate('owner')

        return res.render('admin/post', {
            post: post
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
}

exports.changePostStauts = async(req, res, next) => {
    try {
        const { params } = req
        const post = await post_model.findById(params.id)
        post.status = 2

        await post.save()

        return res.redirect('/administrador/posts')
    } catch (error) {
        console.log(error);
        next(error);
    }
}