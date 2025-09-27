import mongoose, { Document, Schema, Types } from "mongoose";

export interface IChat extends Document {
  users: string[];
  chatType: "private" | "group";
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  createdBy: string;
  admins: string[];
  latestMessage: {
    text: string;
    sender: string;
  };
  pinnedMessages: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const schema: Schema<IChat> = new Schema(
  {
    users: [{ type: String, required: true }],
    chatType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    groupName: String,
    groupDescription: String,
    groupAvatar: String,
    createdBy: {
      type: String,
      required: true,
    },
    admins: [{ type: String, required: true }],
    latestMessage: {
      text: String,
      sender: String,
    },
    pinnedMessages: [{
      type: Schema.Types.ObjectId,
      ref: "Messages",
    }],
  },
  {
    timestamps: true,
  }
);

export const Chat = mongoose.model<IChat>("Chat", schema);
