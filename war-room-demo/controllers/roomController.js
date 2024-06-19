
const cloudinary = require('../cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Room = require("../models/room");

// Handle Room create on POST.
exports.room_upload_post = [
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
        let roomUrl = '';
  
        if (req.file) {
          // Upload room to Cloudinary
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
  
          roomUrl = result.secure_url;
        }
  
        // Create a category object with escaped and trimmed data.
        const room = new Room({ 
          name: req.body.name,
          room_url: roomUrl,
        });
  
        // Check if Item with same name already exists.
        const roomExists = await Room.findOne({ name: req.body.name })
          .collation({ locale: "en", strength: 2 })
          .exec();
  
        if (roomExists) {
          // Room exists, redirect to its detail page.
          res.redirect('/');
        } else {
          // Save the new room and redirect to its detail page.
          await room.save();
          res.redirect('/');
        }
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        next(error);
      }
    }),
  ];