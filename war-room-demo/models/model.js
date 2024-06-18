const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ModelSchema = new Schema({
    name: {type: String, required: true, maxLength: 100},
    model_url: {type: String},
})

ModelSchema.virtual("url").get(function() {
    return `/${this._id}`;
});

module.exports = mongoose.model("Object", ModelSchema);