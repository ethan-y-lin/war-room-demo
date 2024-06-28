const asyncHandler = require("express-async-handler");
const Object = require("../models/object");
const Category = require("../models/category")
const Room = require("../models/room");
const Design = require('../models/design');
exports.index = asyncHandler(async (req, res, next) => {
    const objects = await Object.find().exec();
    const categories = await Category.find().exec();
    const rooms = await Room.find().exec();
    const designs = await Design.find().exec();

    console.log("render home page")
    res.render("index", {
      title: "War Room Demo",
      modal: false,
      modal_title: "",
      objects: objects,
      categories: categories,
      designs: designs,
      rooms: rooms,
    });
  });

  exports.about = (req, res) => {
    res.render('about', {title: "About"});
  };