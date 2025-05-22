import { 
  type User, 
  type InsertUser, 
  type ChatPair, 
  type InsertChatPair, 
  type Message, 
  type InsertMessage 
} from "@shared/schema";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserState(telegramId: string, state: string): Promise<User | undefined>;
  updateUserActivity(telegramId: string, isActive: boolean): Promise<User | undefined>;
  getActiveUsers(): Promise<User[]>;
  getUsersInState(state: string): Promise<User[]>;
  
  // Chat pair operations
  createChatPair(chatPair: InsertChatPair): Promise<ChatPair>;
  getActiveChatPairByUserId(telegramId: string): Promise<ChatPair | undefined>;
  endChatPair(id: number): Promise<ChatPair | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChatPairId(chatPairId: number): Promise<Message[]>;
}

// In-memory implementation of the Storage Interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private usersByTelegramId: Map<string, User>;
  private chatPairs: Map<number, ChatPair>;
  private messages: Map<number, Message>;
  private userIdCounter: number;
  private chatPairIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.usersByTelegramId = new Map();
    this.chatPairs = new Map();
    this.messages = new Map();
    this.userIdCounter = 1;
    this.chatPairIdCounter = 1;
    this.messageIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return this.usersByTelegramId.get(telegramId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      registeredAt: now, 
      lastActive: now, 
      isActive: true, 
      state: "idle" 
    };
    
    this.users.set(id, user);
    this.usersByTelegramId.set(user.telegramId, user);
    return user;
  }

  async updateUserState(telegramId: string, state: string): Promise<User | undefined> {
    const user = this.usersByTelegramId.get(telegramId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, state, lastActive: new Date() };
    this.users.set(user.id, updatedUser);
    this.usersByTelegramId.set(telegramId, updatedUser);
    return updatedUser;
  }

  async updateUserActivity(telegramId: string, isActive: boolean): Promise<User | undefined> {
    const user = this.usersByTelegramId.get(telegramId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, isActive, lastActive: new Date() };
    this.users.set(user.id, updatedUser);
    this.usersByTelegramId.set(telegramId, updatedUser);
    return updatedUser;
  }

  async getActiveUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async getUsersInState(state: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.state === state && user.isActive);
  }

  // Chat pair operations
  async createChatPair(chatPair: InsertChatPair): Promise<ChatPair> {
    const id = this.chatPairIdCounter++;
    const now = new Date();
    const newChatPair: ChatPair = {
      ...chatPair,
      id,
      startedAt: now,
      endedAt: null,
      isActive: true
    };
    
    this.chatPairs.set(id, newChatPair);
    return newChatPair;
  }

  async getActiveChatPairByUserId(telegramId: string): Promise<ChatPair | undefined> {
    return Array.from(this.chatPairs.values()).find(
      pair => pair.isActive && (pair.user1Id === telegramId || pair.user2Id === telegramId)
    );
  }

  async endChatPair(id: number): Promise<ChatPair | undefined> {
    const chatPair = this.chatPairs.get(id);
    if (!chatPair) return undefined;
    
    const updatedChatPair = { ...chatPair, isActive: false, endedAt: new Date() };
    this.chatPairs.set(id, updatedChatPair);
    return updatedChatPair;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const newMessage: Message = {
      ...message,
      id,
      sentAt: now
    };
    
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getMessagesByChatPairId(chatPairId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatPairId === chatPairId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
}

// Import DatabaseStorage implementation
import { DatabaseStorage } from "./dbStorage";

// Export a singleton instance of the storage
// Uncomment the following line to use database storage instead of memory storage
export const storage = new DatabaseStorage();
// export const storage = new MemStorage();
