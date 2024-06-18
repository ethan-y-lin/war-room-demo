const path = require('path');
const fs = require('fs')
const cloudinary = require('../cloudinaryConfig');
const asyncHandler = require("express-async-handler");
const {body, validationResult} = require("express-validator");

const Model = require("../models/model");

