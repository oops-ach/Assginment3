const express = require("express");
const mongoose = require("mongoose");
const Blog = require("./Blog");

const router = express.Router();

/**
 * POST /blogs
 * Create blog
 */
router.post("/", async (req, res) => {
  try {
    const { title, body, author } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        message: "Title and body are required",
      });
    }

    const blog = await Blog.create({ title, body, author });
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /blogs
 * Get all blogs
 */
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /blogs/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /blogs/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, author } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!title || !body) {
      return res.status(400).json({
        message: "Title and body are required",
      });
    }

    const updated = await Blog.findByIdAndUpdate(
      id,
      { title, body, author },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /blogs/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({ message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
