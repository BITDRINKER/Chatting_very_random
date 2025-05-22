import { 
  type User, 
  type InsertUser, 
  type ChatPair, 
  type InsertChatPair, 
  type Message, 
  type InsertMessage,
  users,
  chatPairs,
  messages
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

// Database implementation of the Storage Interface
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure all required fields have default values
    const userToInsert = {
      ...insertUser,
      username: insertUser.username || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null
    };
    
    const [user] = await db.insert(users).values(userToInsert).returning();
    return user;
  }

  async updateUserState(telegramId: string, state: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        state, 
        lastActive: new Date() 
      })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user;
  }

  async updateUserActivity(telegramId: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        isActive, 
        lastActive: new Date() 
      })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user;
  }

  async getActiveUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async getUsersInState(state: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.state, state),
        eq(users.isActive, true)
      ));
  }

  // Chat pair operations
  async createChatPair(chatPair: InsertChatPair): Promise<ChatPair> {
    const [newChatPair] = await db.insert(chatPairs).values(chatPair).returning();
    return newChatPair;
  }

  async getActiveChatPairByUserId(telegramId: string): Promise<ChatPair | undefined> {
    const [pair] = await db
      .select()
      .from(chatPairs)
      .where(and(
        eq(chatPairs.isActive, true),
        or(
          eq(chatPairs.user1Id, telegramId),
          eq(chatPairs.user2Id, telegramId)
        )
      ));
    return pair;
  }

  async endChatPair(id: number): Promise<ChatPair | undefined> {
    const [updatedPair] = await db
      .update(chatPairs)
      .set({ 
        isActive: false, 
        endedAt: new Date() 
      })
      .where(eq(chatPairs.id, id))
      .returning();
    return updatedPair;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesByChatPairId(chatPairId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatPairId, chatPairId))
      .orderBy(messages.sentAt);
  }
}