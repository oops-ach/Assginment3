require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const blogRoutes = require("./blogRoutes");

const app = express();

app.use(express.json());

const path = require("path");
app.use(express.static(path.join(__dirname, "..", "public")));


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB error:", err);
    process.exit(1);
  });

app.use("/blogs", blogRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Blog CRUD API is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
