const asyncHandler = require("express-async-handler");
const Object = require("../models/object");

exports.index = asyncHandler(async (req, res, next) => {
    const objects = await Object.find().exec();
    console.log(objects);
    res.render("index", {
      title: "Home",
      objects: objects,
    });
  });