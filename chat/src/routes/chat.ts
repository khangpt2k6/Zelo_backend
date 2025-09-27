import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  createNewChat,
  createGroupChat,
  getAllChats,
  getMessagesByChat,
  sendMessage,
  replyToMessage,
  pinMessage,
  addReaction,
  getPinnedMessages,
  addUserToGroup,
  removeUserFromGroup,
  updateGroupInfo,
  getGroupMembers,
} from "../controllers/chat.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.post("/chat/new", isAuth, createNewChat);
router.post("/chat/group", isAuth, createGroupChat);
router.get("/chat/all", isAuth, getAllChats);
router.post("/message", isAuth, upload.single("image"), sendMessage);
router.get("/message/:chatId", isAuth, getMessagesByChat);

// New routes for enhanced features
router.post("/message/reply", isAuth, upload.single("image"), replyToMessage);
router.patch("/message/:messageId/pin", isAuth, pinMessage);
router.post("/message/:messageId/reaction", isAuth, addReaction);
router.get("/chat/:chatId/pinned", isAuth, getPinnedMessages);

// Group management routes
router.post("/chat/:chatId/add-users", isAuth, addUserToGroup);
router.delete("/chat/:chatId/remove-user/:targetUserId", isAuth, removeUserFromGroup);
router.patch("/chat/:chatId/group-info", isAuth, updateGroupInfo);
router.get("/chat/:chatId/members", isAuth, getGroupMembers);

export default router;
