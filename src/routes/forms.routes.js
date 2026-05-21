const express = require("express");

const formsController = require("../controllers/forms.controller");

const router = express.Router();

router.post("/contact", formsController.contact);
router.post("/work", formsController.work);

module.exports = router;

