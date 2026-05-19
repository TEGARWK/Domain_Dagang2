const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

router.get("/", verifyAdmin, controller.getAllUsers); // LIST ALL USERS (ADMIN)
router.get("/activities/me", verifyToken, controller.getUserActivities);
router.get("/:id", verifyToken, controller.getUser);
router.put("/:id", verifyToken, controller.updateUser);
router.put("/change-password/:id", verifyToken, controller.changePassword);
router.delete("/:id", verifyAdmin, controller.deleteUser); // DELETE USER (ADMIN)

module.exports = router;
