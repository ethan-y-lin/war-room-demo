const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ObjectSchema = new Schema({
    name: {type: String, required: true, maxLength: 100},
    obj_url: {type: String},
    category: {type: Schema.Types.ObjectId, ref: "Category", required: true},
})

ObjectSchema.virtual("url").get(function() {
    return `/${this._id}`;
});

module.exports = mongoose.model("Object", ObjectSchema);