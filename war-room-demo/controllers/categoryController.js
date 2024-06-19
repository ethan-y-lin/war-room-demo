
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Category = require('../models/category');
const Object = require('../models/object');
// Handle Category create on POST.
exports.category_upload_post = [
    // Validate and sanitize the name field.
    body("name", "Item name must contain at least 3 characters")
      .trim()
      .isLength({ min: 3 })
      .escape(),
  
    // Process request after validation and sanitization.
    asyncHandler(async (req, res, next) => {
        console.log("uploading category")
        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Go back to home page
            console.log(errors);

            const objects = await Object.find().exec();
            const categories = await Category.find().exec();

            res.render("index", {
                title: "War Room Demo",
                modal: false,
                modal_title: "",
                objects: objects,
                categories: categories,
                errors: errors.array(),
                new_category: req.body
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

  // Handle Category delete on POST
exports.category_delete_post = asyncHandler(async (req, res, next) => {
  console.log("Category delete");
    // Get details of book and all their book instances (in parallel)
  try {
    const [category, categories, objects] = await Promise.all([
      Category.findById(req.params.id).populate("objects").exec(),
      Category.find().exec(),
      Object.find().exec()]);

    if (!category) {
      return res.status(404).send('Item not found');
    }

    if (category.objects.length > 0) {
      res.redirect("/");
      return;
    }
    // Delete the item from the database
    await Category.findByIdAndDelete(req.body.categoryid);
    res.redirect("/");
  } catch (error) {
    console.error('Error deleting item:', error);
    next(error);
  }
});