const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Rack Room Backend is running!");
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});