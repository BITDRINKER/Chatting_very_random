import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  state: text("state").default("idle").notNull(), // idle, searching, chatting
});

export const insertUserSchema = createInsertSchema(users).pick({
  telegramId: true,
  username: true,
  firstName: true,
  lastName: true,
});

// Chat pairings
export const chatPairs = pgTable("chat_pairs", {
  id: serial("id").primaryKey(),
  user1Id: text("user1_id").notNull(), // telegram_id of first user
  user2Id: text("user2_id").notNull(), // telegram_id of second user
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertChatPairSchema = createInsertSchema(chatPairs).pick({
  user1Id: true,
  user2Id: true,
});

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatPairId: integer("chat_pair_id").notNull(),
  senderId: text("sender_id").notNull(), // telegram_id of sender
  receiverId: text("receiver_id").notNull(), // telegram_id of receiver
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatPairId: true,
  senderId: true,
  receiverId: true,
  content: true,
});

// Chat state for the client UI representation
export const ChatStateEnum = z.enum(["idle", "searching", "chatting", "disconnected"]);
export type ChatState = z.infer<typeof ChatStateEnum>;

// Message types for client-server communication (socket events)
export interface ChatMessageType {
  id: number;
  senderId: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChatPairType {
  id: number;
  partnerId: string;
  partnerName?: string;
}

export type MessageEvent = {
  type: 'message';
  data: ChatMessageType;
};

export type StatusEvent = {
  type: 'status';
  data: {
    state: ChatState;
    chatPair?: ChatPairType;
  };
};

export type WebSocketEvent = MessageEvent | StatusEvent;

// Types for database entities
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatPair = typeof chatPairs.$inferSelect;
export type InsertChatPair = z.infer<typeof insertChatPairSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
