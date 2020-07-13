const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");

const Post = require("./models/Post");
const User = require("./models/User");
const Links = require("./models/Links");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const upload = multer({
  limits: 1000000,
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/(.jpg|.jpeg|.png)$/i)) {
      return cb(new Error("Plese upload image!"));
    }
    cb(undefined, true);
  },
});

const port = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/blog-api";

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("MONGODB connected!");
  })
  .catch((err) => console.log(err));

const checkValidEntries = (post) => {
  const validEntries = [
    "title",
    "description",
    "publishedAt",
    "author",
    "tags",
    "image",
  ];
  const entries = Object.keys(post).filter((key) => {
    if (!validEntries.includes(key)) return key;
  });
  return entries;
};

const auth = (req, res, next) => {
  if (req.header("Authorization")) {
    const token = req.header("Authorization").split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_Secret);
    if (!user) return res.status(401).send({ error: "Please login!" });
    req.user = user;
    req.token = token;
    next();
  } else {
    res.status(401).send({ error: "Please login!" });
  }
};

app.get("/api/v1/myblog", async (req, res) => {
  try {
    const posts = await Post.find();
    res.status(200).send(posts);
  } catch (err) {
    res.status(500).send({
      error: "Please try again later!",
    });
  }
});

app.post("/api/v1/myblog", upload.single("image"), async (req, res) => {
  const entries = checkValidEntries({ ...req.body, image: req.file });
  if (entries.length > 0)
    return res.status(400).send({ error: "Invalid Entries found!" });
  try {
    const post = await new Post({ ...req.body, image: req.file.buffer });
    await post.save();
    res.status(201).send(post);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.patch("/api/v1/myblog/:id", auth, async (req, res) => {
  const entries = checkValidEntries(req.body);
  if (entries.length > 0)
    return res.status(400).send({ error: "Unable to update invalid Entries!" });
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.send(post);
  } catch (err) {
    res.status(404).send({
      error: "Unable to find any post!",
    });
  }
});

app.delete("/api/v1/myblog/:id", auth, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(400).send({ error: "No Post found!" });
    res.status(204).send(post);
  } catch (err) {
    res.status(404).status({ error: "Unable to find any post!" });
  }
});

app.post("/user/signup", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.send({
      error: "Please provide email and Password!",
    });
  }
  try {
    const password = await bcrypt.hash(req.body.password, 8);
    const user = new User({
      email: req.body.email,
      password,
    });

    await user.save();
    res.send(user);
  } catch (err) {
    res.status(400).send({ error: "Please try after sometimes!" });
  }
});

app.post("/user/login", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res
      .status(404)
      .send({ error: "Please provide email and password!" });
  }
  try {
    const user = await User.findOne({ email: req.body.email });
    console.log(user);
    if (!user) return res.status(400).send({ error: "Invalid Credentials!" });
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    console.log(isMatch);
    if (!isMatch)
      return res.status(400).send({ error: "Invalid Credentials!" });
    console.log("Below not running!");
    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_Secret,
      { expiresIn: "5h" }
    );
    console.log("Im not running!");
    user.tokens = user.tokens.concat({ token });
    await user.save();
    res.send({ user, token });
  } catch (err) {
    res.status(404).send({ error: "Invalid Credentials" });
  }
});

app.get("/user/logout", auth, async (req, res) => {
  const userInfo = req.user;
  const token = req.token;
  const user = await User.findById(userInfo._id);
  if (!user || !token)
    return res.status(401).send({ error: "Please login to continue!" });
  user.tokens = user.tokens.filter((loginToken) => loginToken !== token);
  await user.save();
  res.status(204).send();
});
app.get("/links", async (req, res) => {
  const links = await Links.find();
  res.status(200).send(links);
});
app.get("/links/:id", async (req, res) => {
  const id = req.params.id;
  const link = await Links.findById(id);
  res.status(200).send(link);
});
app.post("/links", async (req, res) => {
  const { linkName, linkURL } = req.body;
  const newLink = new Links({
    linkName,
    linkURL,
  });
  await newLink.save();
  res.status(201).send(newLink);
});

app.patch("/links/:id", async (req, res) => {
  const link = await Links.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(202).send(link);
});

app.delete("/links/:id", async (req, res) => {
  await Links.findByIdAndDelete(req.params.id);
  res.status(202).send({ status: "Success!" });
});

app.get("*", (req, res) => {
  res.status(404).send({
    error: "404 Not Found!",
  });
});
app.listen(port, () => {
  console.log(`Application started on ${port}`);
});
