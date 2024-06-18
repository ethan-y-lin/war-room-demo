const path = require('path');
const fs = require('fs')
const cloudinary = require('../cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Model = require("../models/model");

// Handle Model create on POST.
exports.model_upload_post = [
    // Validate and sanitize the name field.
    body("name", "Item name must contain at least 3 characters")
      .trim()
      .isLength({ min: 3 })
      .escape(),
    // Process request after validation and sanitization.
    asyncHandler(async (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        // Get all categories, which we can use for adding to our item.
        res.redirect("/");
        return;
      }
  
      // No errors, proceed with Cloudinary upload and item creation
      try {
        let modelUrl = '';
  
        if (req.file) {
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
  
          modelUrl = result.secure_url;
        }
  
        // Create a category object with escaped and trimmed data.
        const model = new Model({ 
          name: req.body.name,
          model_url: modelUrl,
        });
  
        // Check if Item with same name already exists.
        const modelExists = await Model.findOne({ name: req.body.name })
          .collation({ locale: "en", strength: 2 })
          .exec();
  
        if (modelExists) {
          // Item exists, redirect to its detail page.
          res.redirect('/');
        } else {
          // Save the new item and redirect to its detail page.
          await model.save();
          res.redirect('/');
        }
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        next(error);
      }
    }),
  ];