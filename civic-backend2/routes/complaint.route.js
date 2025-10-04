import { Router } from "express";
import { verifyToken } from "../middlewares/user.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { allcomplaint, assignedWorker, createcomplaint, filtercomplaint2, usercomplaint } from "../controllers/complaint.controller.js";
import { verifyToken2 } from "../middlewares/officertoken.js";
import { filtercompalint } from "../controllers/complaint.controller.js";

const router3 = Router();

router3.route('/createcomplaint').post(verifyToken,upload.single("media"),createcomplaint)
 router3.route('/allcomplaint').get(allcomplaint);
 router3.route('/assignworker').post(verifyToken2,assignedWorker);
 router3.route('/usercomplaint').get(usercomplaint);
 router3.route('/complaints').get(verifyToken2,filtercompalint);
  router3.route('/complaints2').get(verifyToken2,filtercomplaint2);

 export default router3