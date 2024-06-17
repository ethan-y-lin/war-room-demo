const asyncHandler = require("express-async-handler");
const Object = require("../models/object");
const Category = require("../models/category")

exports.index = asyncHandler(async (req, res, next) => {
    const objects = await Object.find().exec();
    const categories = await Category.find().exec();
    console.log("render home page")
    res.render("index", {
      title: "War Room Demo",
      modal: false,
      modal_title: "",
      objects: objects,
      categories: categories,
    });
  });