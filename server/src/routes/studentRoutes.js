const { Router } = require("express");
const controller = require("../controllers/studentController");

const router = Router();

router.get("/stats", controller.getStats);
router.get("/meta", controller.getMeta);

router.route("/").get(controller.listStudents).post(controller.createStudent);

router
  .route("/:id")
  .get(controller.getStudent)
  .put(controller.updateStudent)
  .delete(controller.deleteStudent);

module.exports = router;
