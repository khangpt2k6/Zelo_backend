import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  sender: string;
  text?: string;
  image?: {
    url: string;
    publicId: string;
  };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: Date;
  seenBy: string[]; // Track who has seen the message (for group chats)
  // New fields for enhanced features
  replyTo?: {
    messageId: Types.ObjectId;
    text: string;
    sender: string;
  };
  isPinned: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
  reactions: IReaction[];
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<IReaction>({
  userId: {
    type: String,
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const schema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: String,
      requred: true,
    },
    text: String,
    image: {
      url: String,
      publicId: String,
    },
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    seenBy: [{
      type: String,
      default: [],
    }],
    // New fields
    replyTo: {
      messageId: {
        type: Schema.Types.ObjectId,
        ref: "Messages",
      },
      text: String,
      sender: String,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    pinnedBy: {
      type: String,
      default: null,
    },
    reactions: [reactionSchema],
  },
  {
    timestamps: true,
  }
);

export const Messages = mongoose.model<IMessage>("Messages", schema);
