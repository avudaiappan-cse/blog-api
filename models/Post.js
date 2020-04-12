const mongoose = require('mongoose');


const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    author: {
        type: String,
        default: "Avudaiappan"
    },
    publishedAt: {
        type: Date,
        default: Date.now()
    },
    tags: {
        type:String,
        required: true
    },
    image: {
        type: Buffer,
        required: true
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;