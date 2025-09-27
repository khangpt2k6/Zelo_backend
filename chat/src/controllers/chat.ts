import axios from "axios";
import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/Chat.js";
import { Messages } from "../models/Messages.js";
import { getRecieverSocketId, io } from "../config/socket.js";
import { workerData } from "worker_threads";
import mongoose from "mongoose";

export const createNewChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { otherUserId } = req.body;
    if (!otherUserId) {
      res.status(400).json({
        message: "Other userid is required",
      });
      return;
    }

    const existingChat = await Chat.findOne({
      users: { $all: [userId, otherUserId], $size: 2 },
      chatType: "private",
    });

    if (existingChat) {
      res.json({
        message: "Chat already exists",
        chatId: existingChat._id,
      });
      return;
    }

    const newChat = await Chat.create({
      users: [userId, otherUserId],
      chatType: "private",
      createdBy: userId,
      admins: [userId],
    });

    res.status(201).json({
      message: "New Chat created",
      chatId: newChat._id,
    });
  }
);

export const createGroupChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { groupName, groupDescription, groupAvatar, userIds } = req.body;
    
    if (!groupName || !userIds || !Array.isArray(userIds) || userIds.length < 2) {
      res.status(400).json({
        message: "Group name and at least 2 users are required",
      });
      return;
    }

    // Add the creator to the users list if not already included
    const allUsers = userIds.includes(userId) ? userIds : [userId, ...userIds];

    const newGroupChat = await Chat.create({
      users: allUsers,
      chatType: "group",
      groupName,
      groupDescription,
      groupAvatar,
      createdBy: userId,
      admins: [userId], // Creator is the first admin
    });

    res.status(201).json({
      message: "Group chat created successfully",
      chatId: newGroupChat._id,
      group: newGroupChat,
    });
  }
);

export const getAllChats = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(400).json({
      message: " UserId missing",
    });
    return;
  }

  const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });

  const chatWithUserData = await Promise.all(
    chats.map(async (chat) => {
      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender: { $ne: userId },
        seen: false,
      });

      if (chat.chatType === "private") {
        // Handle private chats (existing logic)
        const otherUserId = chat.users.find((id) => id !== userId);

        try {
          const { data } = await axios.get(
            `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
          );

          return {
            user: data,
            chat: {
              ...chat.toObject(),
              latestMessage: chat.latestMessage || null,
              unseenCount,
            },
          };
        } catch (error) {
          console.log(error);
          return {
            user: { _id: otherUserId, name: "Unknown User" },
            chat: {
              ...chat.toObject(),
              latestMessage: chat.latestMessage || null,
              unseenCount,
            },
          };
        }
      } else {
        // Handle group chats
        return {
          user: {
            _id: chat._id,
            name: chat.groupName,
            avatar: chat.groupAvatar,
            isGroup: true,
            memberCount: chat.users.length,
            admins: chat.admins,
          },
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount,
          },
        };
      }
    })
  );

  res.json({
    chats: chatWithUserData,
  });
});

export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
  const senderId = req.user?._id;
  const { chatId, text } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    res.status(401).json({
      message: "unauthorized",
    });
    return;
  }
  if (!chatId) {
    res.status(400).json({
      message: "ChatId Required",
    });
    return;
  }

  if (!text && !imageFile) {
    res.status(400).json({
      message: "Either text or image is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === senderId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const otherUserId = chat.users.find(
    (userId) => userId.toString() !== senderId.toString()
  );

  if (!otherUserId) {
    res.status(401).json({
      message: "No other user",
    });
    return;
  }

  //socket setup
  const receiverSocketId = getRecieverSocketId(otherUserId.toString());
  let isReceiverInChatRoom = false;

  if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket && receiverSocket.rooms.has(chatId)) {
      isReceiverInChatRoom = true;
    }
  }

  let messageData: any = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom ? new Date() : undefined,
  };

  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId: imageFile.filename,
    };
    messageData.messageType = "image";
    messageData.text = text || "";
  } else {
    messageData.text = text;
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);

  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "📷 Image" : text;

  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { new: true }
  );

  //emit to sockets
  io.to(chatId).emit("newMessage", savedMessage);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getRecieverSocketId(senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  if (isReceiverInChatRoom && senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", {
      chatId: chatId,
      seenBy: otherUserId,
      messageIds: [savedMessage._id],
    });
  }

  res.status(201).json({
    message: savedMessage,
    sender: senderId,
  });
});

export const getMessagesByChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (!chatId) {
      res.status(400).json({
        message: "ChatId Required",
      });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({
        message: "Chat not found",
      });
      return;
    }

    const isUserInChat = chat.users.some(
      (userId) => userId.toString() === userId.toString()
    );

    if (!isUserInChat) {
      res.status(403).json({
        message: "You are not a participant of this chat",
      });
      return;
    }

    const messagesToMarkSeen = await Messages.find({
      chatId: chatId,
      sender: { $ne: userId },
      seen: false,
    });

    await Messages.updateMany(
      {
        chatId: chatId,
        sender: { $ne: userId },
        seen: false,
      },
      {
        seen: true,
        seenAt: new Date(),
      }
    );

    const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });

    const otherUserId = chat.users.find((id) => id !== userId);

    try {
      const { data } = await axios.get(
        `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
      );

      if (!otherUserId) {
        res.status(400).json({
          message: "No other user",
        });
        return;
      }

      //socket work
      if (messagesToMarkSeen.length > 0) {
        const otherUserSocketId = getRecieverSocketId(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("messagesSeen", {
            chatId: chatId,
            seenBy: userId,
            messageIds: messagesToMarkSeen.map((msg) => msg._id),
          });
        }
      }

      res.json({
        messages,
        user: data,
      });
    } catch (error) {
      console.log(error);
      res.json({
        messages,
        user: { _id: otherUserId, name: "Unknown User" },
      });
    }
  }
);

// New controller functions for enhanced features

export const replyToMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
  const senderId = req.user?._id;
  const { chatId, text, replyToMessageId } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!chatId || !replyToMessageId) {
    res.status(400).json({
      message: "ChatId and replyToMessageId are required",
    });
    return;
  }

  if (!text && !imageFile) {
    res.status(400).json({
      message: "Either text or image is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const replyToMessage = await Messages.findById(replyToMessageId);
  if (!replyToMessage) {
    res.status(404).json({
      message: "Reply message not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === senderId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const otherUserId = chat.users.find(
    (userId) => userId.toString() !== senderId.toString()
  );

  const receiverSocketId = getRecieverSocketId(otherUserId?.toString() || "");
  let isReceiverInChatRoom = false;

  if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket && receiverSocket.rooms.has(chatId)) {
      isReceiverInChatRoom = true;
    }
  }

  let messageData: any = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom ? new Date() : undefined,
    replyTo: {
      messageId: replyToMessageId,
      text: replyToMessage.text || "Image",
      sender: replyToMessage.sender,
    },
  };

  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId: imageFile.filename,
    };
    messageData.messageType = "image";
    messageData.text = text || "";
  } else {
    messageData.text = text;
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);
  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "📷 Image" : text;

  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { new: true }
  );

  // Emit to sockets
  io.to(chatId).emit("newMessage", savedMessage);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getRecieverSocketId(senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  res.status(201).json({
    message: savedMessage,
    sender: senderId,
  });
});

export const pinMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { messageId } = req.params;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!messageId) {
    res.status(400).json({
      message: "MessageId is required",
    });
    return;
  }

  const message = await Messages.findById(messageId);
  if (!message) {
    res.status(404).json({
      message: "Message not found",
    });
    return;
  }

  const chat = await Chat.findById(message.chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === userId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  // Toggle pin status
  const isPinned = !message.isPinned;
  
  await Messages.findByIdAndUpdate(new mongoose.Types.ObjectId(messageId), {
    isPinned,
    pinnedAt: isPinned ? new Date() : null,
    pinnedBy: isPinned ? userId : null,
  });

  if (isPinned) {
    // Add to chat's pinned messages if not already there
    if (!chat.pinnedMessages.some(id => id.toString() === messageId)) {
      await Chat.findByIdAndUpdate(message.chatId, {
        $addToSet: { pinnedMessages: new mongoose.Types.ObjectId(messageId) },
      });
    }
  } else {
    // Remove from chat's pinned messages
    await Chat.findByIdAndUpdate(message.chatId, {
      $pull: { pinnedMessages: new mongoose.Types.ObjectId(messageId) },
    });
  }

  // Emit socket event
  io.to(message.chatId.toString()).emit("messagePinned", {
    messageId,
    isPinned,
    pinnedBy: userId,
  });

  res.json({
    message: "Message pin status updated",
    isPinned,
  });
});

export const addReaction = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!messageId || !emoji) {
    res.status(400).json({
      message: "MessageId and emoji are required",
    });
    return;
  }

  const message = await Messages.findById(messageId);
  if (!message) {
    res.status(404).json({
      message: "Message not found",
    });
    return;
  }

  const chat = await Chat.findById(message.chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (id) => id.toString() === userId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  // Check if user already reacted with this emoji
  const existingReaction = message.reactions.find(
    (reaction) => reaction.userId === userId && reaction.emoji === emoji
  );

  if (existingReaction) {
    // Remove reaction
    await Messages.findByIdAndUpdate(messageId, {
      $pull: { reactions: { userId, emoji } },
    });
  } else {
    // Add reaction
    await Messages.findByIdAndUpdate(messageId, {
      $push: { reactions: { userId, emoji, createdAt: new Date() } },
    });
  }

  const updatedMessage = await Messages.findById(messageId);

  // Emit socket event
  io.to(message.chatId.toString()).emit("messageReaction", {
    messageId,
    reactions: updatedMessage?.reactions || [],
  });

  res.json({
    message: "Reaction updated",
    reactions: updatedMessage?.reactions || [],
  });
});

export const getPinnedMessages = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!chatId) {
    res.status(400).json({
      message: "ChatId is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === userId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const pinnedMessages = await Messages.find({
    _id: { $in: chat.pinnedMessages },
  }).sort({ pinnedAt: -1 });

  res.json({
    pinnedMessages,
  });
});

// Group Management Functions
export const addUserToGroup = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;
  const { userIds } = req.body;

  if (!userId || !chatId || !userIds || !Array.isArray(userIds)) {
    res.status(400).json({
      message: "ChatId and userIds array are required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  if (chat.chatType !== "group") {
    res.status(400).json({
      message: "This is not a group chat",
    });
    return;
  }

  if (!chat.admins.includes(userId)) {
    res.status(403).json({
      message: "Only admins can add users to the group",
    });
    return;
  }

  // Add new users to the group
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: { users: { $each: userIds } },
    },
    { new: true }
  );

  res.json({
    message: "Users added to group successfully",
    chat: updatedChat,
  });
});

export const removeUserFromGroup = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId, targetUserId } = req.params;

  if (!userId || !chatId || !targetUserId) {
    res.status(400).json({
      message: "ChatId and targetUserId are required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  if (chat.chatType !== "group") {
    res.status(400).json({
      message: "This is not a group chat",
    });
    return;
  }

  if (!chat.admins.includes(userId)) {
    res.status(403).json({
      message: "Only admins can remove users from the group",
    });
    return;
  }

  if (targetUserId === chat.createdBy) {
    res.status(400).json({
      message: "Cannot remove the group creator",
    });
    return;
  }

  // Remove user from the group
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: targetUserId },
    },
    { new: true }
  );

  res.json({
    message: "User removed from group successfully",
    chat: updatedChat,
  });
});

export const updateGroupInfo = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;
  const { groupName, groupDescription, groupAvatar } = req.body;

  if (!userId || !chatId) {
    res.status(400).json({
      message: "ChatId is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  if (chat.chatType !== "group") {
    res.status(400).json({
      message: "This is not a group chat",
    });
    return;
  }

  if (!chat.admins.includes(userId)) {
    res.status(403).json({
      message: "Only admins can update group information",
    });
    return;
  }

  const updateData: any = {};
  if (groupName) updateData.groupName = groupName;
  if (groupDescription) updateData.groupDescription = groupDescription;
  if (groupAvatar) updateData.groupAvatar = groupAvatar;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    updateData,
    { new: true }
  );

  res.json({
    message: "Group information updated successfully",
    chat: updatedChat,
  });
});

export const getGroupMembers = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;

  if (!userId || !chatId) {
    res.status(400).json({
      message: "ChatId is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  if (chat.chatType !== "group") {
    res.status(400).json({
      message: "This is not a group chat",
    });
    return;
  }

  if (!chat.users.includes(userId)) {
    res.status(403).json({
      message: "You are not a member of this group",
    });
    return;
  }

  // Get user details for all group members
  const memberDetails = await Promise.all(
    chat.users.map(async (memberId) => {
      try {
        const { data } = await axios.get(
          `${process.env.USER_SERVICE}/api/v1/user/${memberId}`
        );
        return {
          ...data,
          isAdmin: chat.admins.includes(memberId),
          isCreator: memberId === chat.createdBy,
        };
      } catch (error) {
        return {
          _id: memberId,
          name: "Unknown User",
          isAdmin: chat.admins.includes(memberId),
          isCreator: memberId === chat.createdBy,
        };
      }
    })
  );

  res.json({
    members: memberDetails,
    groupInfo: {
      _id: chat._id,
      groupName: chat.groupName,
      groupDescription: chat.groupDescription,
      groupAvatar: chat.groupAvatar,
      createdBy: chat.createdBy,
      admins: chat.admins,
      memberCount: chat.users.length,
    },
  });
});
