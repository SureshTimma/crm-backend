import { 
  UserModel, 
  ContactModel, 
  ActivityModel, 
  TagModel,
  ChatModel
} from "../models";
import mongoose from "mongoose";

export interface CRMContext {
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    company?: string;
    tags: string[];
    notes?: string;
    lastInteraction: Date;
  }>;
  activities: Array<{
    action: string;
    entityType: string;
    entityName: string;
    timestamp: Date;
    description?: string;
  }>;
  chatHistory: Array<{
    message: string;
    sender: 'user' | 'ai';
    timestamp: Date;
  }>;
  recentTags: string[];
}

/**
 * Builds comprehensive CRM context for AI assistant
 */
export async function buildCRMContext(
  userId: string, 
  userMessage: string, 
  conversationId?: string
): Promise<string> {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get user information
    const user = await UserModel.findById(userObjectId)
      .select('name email profileImage')
      .lean<{
        _id: string;
        name: string;
        email: string;
        profileImage?: string;
      }>();

    if (!user) {
      throw new Error('User not found');
    }

    // Get recent contacts with populated tags
    const contacts = await ContactModel.find({ createdBy: userObjectId })
      .sort({ lastInteraction: -1 })
      .limit(10)
      .populate('tags', 'tagName')
      .lean();

    // Get recent activities
    const activities = await ActivityModel.find({ user: userObjectId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Get chat history for this conversation if provided
    let chatHistory: Array<{
      message: string;
      sender: "user" | "ai";
      timestamp: Date;
    }> = [];
    if (conversationId) {
      const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      chatHistory = await ChatModel.find({ 
        user: userObjectId, 
        conversationId: conversationObjectId 
      })
        .sort({ timestamp: 1 })
        .limit(20) // Last 20 messages for context
        .lean<Array<{
          message: string;
          sender: "user" | "ai";
          timestamp: Date;
        }>>();
    }

    // Get all tags used by user for reference
    const userTags = await TagModel.find({ createdBy: userObjectId })
      .sort({ usageCount: -1 })
      .limit(10)
      .lean();

    // Build formatted context
    return buildFormattedContext({
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      },
      contacts: contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        tags: contact.tags?.map((tag: { tagName: string }) => tag.tagName) || [],
        notes: contact.notes,
        lastInteraction: contact.lastInteraction
      })),
      activities: activities.map((activity) => ({
        action: activity.action,
        entityType: activity.entityType,
        entityName: activity.entityName,
        timestamp: activity.timestamp,
        description: activity.description
      })),
      chatHistory: chatHistory.map((chat) => ({
        message: chat.message,
        sender: chat.sender,
        timestamp: chat.timestamp
      })),
      recentTags: userTags.map((tag) => tag.tagName),
      userMessage
    });

  } catch (error) {
    console.error('Error building CRM context:', error);
    return buildFallbackContext(userMessage);
  }
}

/**
 * Formats the CRM context into a structured prompt for the AI
 */
function buildFormattedContext(data: CRMContext & { userMessage: string }): string {
  const { user, contacts, activities, chatHistory, recentTags, userMessage } = data;

  // Format contacts summary
  const contactsSummary = contacts.length > 0 
    ? contacts.map(contact => {
        const tagsStr = contact.tags.length > 0 ? contact.tags.join(', ') : 'None';
        const lastInteraction = contact.lastInteraction 
          ? new Date(contact.lastInteraction).toLocaleDateString()
          : 'Unknown';
        
        return `• ${contact.name} (${contact.email})${contact.company ? ` | Company: ${contact.company}` : ''}${contact.phone ? ` | Phone: ${contact.phone}` : ''} | Tags: ${tagsStr} | Last Contact: ${lastInteraction}${contact.notes ? ` | Notes: ${contact.notes.substring(0, 100)}${contact.notes.length > 100 ? '...' : ''}` : ''}`;
      }).join('\n')
    : 'No contacts found.';

  // Format activities summary  
  const activitiesSummary = activities.length > 0
    ? activities.map(activity => {
        const timeStr = new Date(activity.timestamp).toLocaleDateString();
        return `• ${activity.action} on ${activity.entityType}: ${activity.entityName} (${timeStr})${activity.description ? ` - ${activity.description}` : ''}`;
      }).join('\n')
    : 'No recent activities.';

  // Format chat history
  const chatSummary = chatHistory.length > 0
    ? chatHistory.slice(-10).map(chat => { // Last 10 messages
        const timeStr = new Date(chat.timestamp).toLocaleTimeString();
        return chat.sender === 'ai' 
          ? `AI (${timeStr}): ${chat.message}`
          : `User (${timeStr}): ${chat.message}`;
      }).join('\n')
    : 'This is the start of your conversation.';

  // Format tags
  const tagsSummary = recentTags.length > 0 
    ? recentTags.join(', ')
    : 'None';

  return `
You are a helpful AI assistant integrated into a CRM system. You have access to the user's CRM data to provide contextual and personalized assistance.

👤 USER PROFILE:
• Name: ${user.name}
• Email: ${user.email}

📊 CRM DATA SUMMARY:
• Total Contacts: ${contacts.length}
• Recent Activities: ${activities.length}
• Available Tags: ${tagsSummary}

📇 RECENT CONTACTS (Last 10):
${contactsSummary}

📌 RECENT ACTIVITIES (Last 10):
${activitiesSummary}

💬 CONVERSATION HISTORY:
${chatSummary}

📝 CURRENT USER MESSAGE:
"${userMessage}"

INSTRUCTIONS:
- Use the above CRM context to provide relevant, personalized responses
- Help with contact management, sales insights, activity tracking, and CRM best practices
- Reference specific contacts, activities, or data when relevant to the user's question
- If asked about contacts or activities not in the context, mention you can only see recent data
- Provide actionable CRM advice based on the user's current data patterns
- Keep responses helpful, professional, and concise
- If the user asks about general topics, try to relate them back to CRM best practices when appropriate

Please respond to the user's message using this CRM context.
`.trim();
}

/**
 * Provides a fallback context when CRM data cannot be retrieved
 */
function buildFallbackContext(userMessage: string): string {
  return `
You are a helpful AI assistant for a CRM system. While I don't have access to your specific CRM data right now, I can still help you with:

- General CRM best practices
- Contact management strategies  
- Sales pipeline optimization
- Activity tracking recommendations
- Data organization tips

Current message: "${userMessage}"

How can I assist you with your CRM needs?
`.trim();
}

/**
 * Builds user-specific context for analytics and insights
 */
export async function buildAnalyticsContext(userId: string): Promise<{
  totalContacts: number;
  totalActivities: number;
  totalTags: number;
  recentActivityCount: number;
  topTags: string[];
  contactsByCompany: Record<string, number>;
}> {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get counts
    const totalContacts = await ContactModel.countDocuments({ createdBy: userObjectId });
    const totalActivities = await ActivityModel.countDocuments({ user: userObjectId });
    const totalTags = await TagModel.countDocuments({ createdBy: userObjectId });
    
    // Get recent activity count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivityCount = await ActivityModel.countDocuments({
      user: userObjectId,
      timestamp: { $gte: sevenDaysAgo }
    });
    
    // Get top tags
    const topTagsData = await TagModel.find({ createdBy: userObjectId })
      .sort({ usageCount: -1 })
      .limit(5)
      .lean();
    
    const topTags = topTagsData.map((tag) => tag.tagName);
    
    // Get contacts by company
    const contactsByCompanyData = await ContactModel.aggregate([
      { $match: { createdBy: userObjectId } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const contactsByCompany: Record<string, number> = {};
    contactsByCompanyData.forEach((item: { _id: string | null; count: number }) => {
      contactsByCompany[item._id || 'No Company'] = item.count;
    });
    
    return {
      totalContacts,
      totalActivities,
      totalTags,
      recentActivityCount,
      topTags,
      contactsByCompany
    };
    
  } catch (error) {
    console.error('Error building analytics context:', error);
    return {
      totalContacts: 0,
      totalActivities: 0,
      totalTags: 0,
      recentActivityCount: 0,
      topTags: [],
      contactsByCompany: {}
    };
  }
}
