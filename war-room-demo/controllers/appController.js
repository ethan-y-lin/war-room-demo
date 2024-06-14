const asyncHandler = require("express-async-handler");
const Object = require("../models/object");
const Categories = require("../models/category")

exports.index = asyncHandler(async (req, res, next) => {
    const objects = await Object.find().exec();
    const categories = await Categories.find.exec();
    console.log("render home page")
    res.render("index", {
      title: "War Room Demo",
      modal: false,
      modal_title: "",
      objects: objects,
      categories: categories,
    });
  });