const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({
  linkName: {
    type: String,
    required: true,
  },
  linkURL: {
    type: String,
    required: true,
  },
});

const Links = mongoose.model("Links", linkSchema);

module.exports = Links;
