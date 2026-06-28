import express from "express";
import {
  saveSearch,
  getUserSearches
} from "../controllers/searchController.js";

const router = express.Router();

router.post("/search", saveSearch);

router.get(
  "/user/:userId/searches",
  getUserSearches
);

export default router;