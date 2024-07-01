
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
            console.error('Errors:', errors);
            res.status(500).json({ success: false, error: 'Failed to add item' });
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
          res.status(500).json({ success: false, error: 'Category already exists' });
        } else {
          
          // Save the new category and redirect to its detail page.
          await category.save();
          
          console.log("uploaded category");
          // Send the generated URL back to the client
          res.status(200).json({ success: true, url: category.url });
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
      return res.status(404).send('There are objects in this category');
    }
    // Delete the item from the database
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).send({ success: false });
  }
});

