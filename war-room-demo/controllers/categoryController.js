
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
  
    // Process request after validation and sanitization.
    asyncHandler(async (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);
        console.log("uploading category")
        console.log(req.body.name);
        if (!errors.isEmpty()) {
            // There are errors. Go back to home page
            res.render("/", {
                // // object: req.body, // Use req.body instead of item object since it doesn't exist yet
                // errors: errors.array(),
            });
            return;
        }
  
      
        // Create a category object with escaped and trimmed data.
        const category = new Category({ 
          name: req.body.name,
          objects: [],
        });
  
        // Check if Category with same name already exists.
        const categoryExists = await Category.findOne({ name: req.body.name })
          .collation({ locale: "en", strength: 2 })
          .exec();
  
        if (categoryExists) {
          // Category exists, redirect to its detail page.
          res.redirect('/');
        } else {
        
          // Save the new category and redirect to its detail page.
          await category.save();
          console.log("uploaded category");
          res.redirect('/');
        }
    }),
  ];