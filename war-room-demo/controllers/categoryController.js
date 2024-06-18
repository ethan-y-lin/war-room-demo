const path = require('path');
const fs = require('fs')
const cloudinary = require('../cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Category = require('../models/category');

// Handle Category create on POST.
exports.category_upload_post = [
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
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        //default categories for form dropdown and layer 2 menu
        const defaultCategories = ['chairs', 'sofas', 'tables'];
        // There are errors. Render the form again with sanitized values/error messages.
        // Get all categories, which we can use for adding to our item.
        console.log("render modal")
        res.render("index", {
          modal_title: "Upload Object",
          object: req.body, // Use req.body instead of item object since it doesn't exist yet
          errors: errors.array(),
          defaultCategories: defaultCategories,
        });
        return;
      }
  
      // No errors, proceed with Cloudinary upload and item creation
      try {
        let objectUrl = '';
  
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
  
          objectUrl = result.secure_url;
        }
  
        // Create a category object with escaped and trimmed data.
        const object = new Object({ 
          name: req.body.name,
          obj_url: objectUrl,
          category: req.body.category
        });
  
        // Check if Item with same name already exists.
        const objectExists = await Object.findOne({ name: req.body.name })
          .collation({ locale: "en", strength: 2 })
          .exec();
  
        if (objectExists) {
          // Item exists, redirect to its detail page.
          res.redirect('/');
        } else {
          // Save the new item and redirect to its detail page.
          await object.save();
          res.redirect('/');
        }
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        next(error);
      }
    }),
  ];