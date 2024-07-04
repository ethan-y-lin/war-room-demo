const path = require('path');
const fs = require('fs')
const cloudinary = require('../config/cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");
const mongoose = require('mongoose');

const Object = require("../models/object");
const Category = require("../models/category");
const Design = require('../models/design');
const { getIO } = require('../socketHandler');

// Display list of all Objects.
exports.object_list = asyncHandler(async (req, res, next) => {
    const allObjects = await Object.find().sort({ name: 1 }).exec();
    res.render("object_list", {
      title: "Object List",
      object_list: allObjects,
    });
  });

  // Display Item upload form on GET.
exports.object_upload_get = asyncHandler (async (req, res, next) => {
  const objects = await Object.find().exec();
  const categories = await Category.find().exec();
  // Get all object, which we can use for adding to our item.
  console.log("render modal")
  res.render("index", {
    title: "War Room Demo",
    modal: true,
    modal_title: "Upload Object",
    objects: objects,
    categories: categories,
  }, function(err, html) {
    if (err) {
        // Handle the error, for example, log it and send a 500 response
        console.error('Rendering error:', err);
        return res.status(500).send('An error occurred while rendering the page.');
    }
    // Send the rendered HTML to the client
    res.send(html);

  });
});

  // Display detail page for a specific Object.
  exports.object_detail = asyncHandler(async (req, res, next) => {
    // // Get details of object and all their books (in parallel)
      const object = await Object.findById(req.params.id).exec();
      if (object === null) {
        // No results.
        const err = new Error("Object not found");
        err.status = 404;
        return next(err);
      }
      // req.session.object = object;
      // req.session.save((err) => {
      //   if (err) {
      //     return res.status(500).send('Failed to save session');
      //   }
      //   res.redirect("/");
      // });
      console.log(object);
      res.json(object);
  });

// Handle Object create on POST.
exports.object_upload_post = [
  // Validate and sanitize the name field.
  body("name", "Item name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),
  body("category", "Category must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    console.log("uploading object");
    // Extract the validation errors from a request.
    const errors = validationResult(req);
    const io = getIO();
    if (!errors.isEmpty()) {
      //default categories for form dropdown and layer 2 menu
      console.error('Errors:', errors);
      res.status(500).json({ success: false, error: 'Failed to add item' });
    }

    // No errors, proceed with Cloudinary upload and item creation

    let objectUrl = '';

    if (req.file) {

      io.emit('uploadProgress', {progress: 10});
      
      try {
        // Simulate Progres Updates
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (progress < 100) {
            io.emit('uploadProgress', { progress });
          } else {
            clearInterval(interval);
          }
        }, 500);

        // Upload model to Cloudinary
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ 
            resource_type: 'raw',
          }, (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }).end(req.file.buffer);
        });

        objectUrl = result.secure_url;
    

        // Create a category object with escaped and trimmed data.
        const object = new Object({ 
          name: req.body.name,
          obj_url: objectUrl,
          category: req.body.category
        });

        io.emit('uploadProgress', {progress: 100});
        // Check if Item with same name already exists.
        const objectExists = await Object.findOne({ name: req.body.name })
          .collation({ locale: "en", strength: 2 })
          .exec();

        if (objectExists) {
          // Item exists
          res.status(500).json({ success: false, error: 'Object already exists' });
        } else {
          const objectCategory = await Category.findById(req.body.category).exec();
          const update = [...objectCategory.objects, object._id];
          await Category.findByIdAndUpdate(req.body.category, {objects: update}, {});
          // Save the new item and redirect to its detail page.
          await object.save();
          // Send the generated URL back to the client
          res.status(200).json({success: true, category: objectCategory.name, obj_url: object.url, message: 'File uploaded successfully'});
        }

      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        res.status(500).json({ success: false, error: "Failed to upload file." });
      }
  } else {
    res.status(400).json({success: false, error: 'No file uploaded'})
  }
    
  }),
];

// Handle Object delete on POST
exports.object_delete_post = asyncHandler(async (req, res, next) => {

  try {
    console.log(req.params.id)
      // Check if objectId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ObjectId' });
    }
    const designs = await Design.find({'objects.object' : req.params.id}).exec();
    if (designs.length > 0) {
      return res.status(500).send({ success: false, message: "Object is used in designs." });
    }
    const object = await Object.findById(req.params.id);

    if (!object) {
      return res.status(404).send('Item not found');
    }

    // Extract public ID from Cloudinary URL
    const urlParts = object.obj_url.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];

    // Delete the image from Cloudinary
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error('Error deleting model from Cloudinary:', error);
      } else {
        console.log('Model deleted from Cloudinary:', result);
      }
    });

    // Delete the item from the database
    await Object.findByIdAndDelete(req.params.id);
    return res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return res.status(500).send({ success: false });
  }
});

// // Handle Item update on GET
// exports.item_update_get = asyncHandler (async (req, res, next) => {
//   // Get details of item and all their items (in parallel)
//     // Get details of category and all their items (in parallel)
//     const [item, allCategories] = await Promise.all([
//       Item.findById(req.params.id).exec(),
//       Category.find().sort({name:1}).exec(),
//     ]);
  
//   if (item === null) {
//     // No results.
//     const err = new Error("Category not found");
//     err.status = 404;
//     return next(err);
//   }
//   res.render("item_form", {
//     title: "Update Item",
//     item: item,
//     categories: allCategories,
//   });
// })

// // Handle Item update on POST.
// exports.item_update_post = [
//   // Validate and sanitize the name field.
//   body("name", "Item name must contain at least 3 characters")
//     .trim()
//     .isLength({ min: 3 })
//     .escape(),
//   body("description").trim().escape(),
//   body("category", "Category must not be empty.").trim().isLength({min: 1}).escape(),
//   body("price", "Price must not be empty.").trim().isLength({min: 1}).escape(),
//   body("numInStock", "numInStock must not be empty.").trim().isLength({min: 1}).escape(),
//   // Process request after validation and sanitization.
//   asyncHandler(async (req, res, next) => {
//     // Extract the validation errors from a request.
//     const errors = validationResult(req);

//     // Create a category object with escaped and trimmed data.
//     const item = new Item({ name: req.body.name,
//                             description: req.body.description,
//                             category: req.body.category, 
//                             price: req.body.price, 
//                             numInStock: req.body.numInStock,
//                             img_url: ('/' + req.file.path),
//                             _id: req.params.id
//     });

//     if (!errors.isEmpty()) {
//       // There are errors. Render the form again with sanitized values/error messages.
//       // Get all categories, which we can use for adding to our item.
//       const allCategories =  await Category.find().sort({name:1}).exec();
//       res.render("item_form", {
//         title: "Create Item",
//         item: item,
//         categories: allCategories,
//         errors: errors.array(),
//       });
//       return;
//     } else {
//       // Data from form is valid.
//       const updatedItem = await Item.findByIdAndUpdate(req.params.id, item, {});
//       res.redirect(updatedItem.url);
//     }
//   }),
// ];