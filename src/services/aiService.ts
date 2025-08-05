import OpenAI from "openai";
import { buildCRMContext, buildAnalyticsContext } from "./aiContext";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIServiceResponse {
  message: string;
  conversationId?: string;
  context?: {
    contactsCount: number;
    activitiesCount: number;
    tagsCount: number;
  };
}

export class EnhancedAIService {
  /**
   * Processes user message with full CRM context
   */
  static async processWithCRMContext(
    userMessage: string,
    userId: string,
    conversationId?: string
  ): Promise<string> {
    try {
      console.log('🔵 Processing message with CRM context:', userMessage, 'for user:', userId);

      // Build comprehensive CRM context
      const systemPrompt = await buildCRMContext(userId, userMessage, conversationId);
      
      console.log('🔧 CRM context built successfully');

      // Prepare messages for OpenAI
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userMessage
        }
      ];

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const aiReply = response.choices?.[0]?.message?.content || 
        'Sorry, I couldn\'t generate a response.';

      console.log('✅ AI replied successfully');
      return aiReply.trim();

    } catch (error) {
      console.error('🔴 Enhanced AI processing failed:', error);
      
      // Fallback to simple response
      return await this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Generates insights about user's CRM data
   */
  static async generateCRMInsights(userId: string): Promise<string> {
    try {
      console.log('📊 Generating CRM insights for user:', userId);

      const analytics = await buildAnalyticsContext(userId);

      const insightPrompt = `
Based on the CRM data analysis, provide actionable insights and recommendations:

📈 CURRENT METRICS:
• Total Contacts: ${analytics.totalContacts}
• Total Activities: ${analytics.totalActivities}
• Total Tags: ${analytics.totalTags}
• Recent Activities (7 days): ${analytics.recentActivityCount}
• Top Tags: ${analytics.topTags.join(', ') || 'None'}

📊 CONTACTS BY COMPANY:
${Object.entries(analytics.contactsByCompany)
  .map(([company, count]) => `• ${company}: ${count} contacts`)
  .join('\n') || 'No company data available'}

Please provide:
1. 3-5 key insights about their CRM usage patterns
2. Specific recommendations for improvement
3. Potential opportunities they might be missing
4. Best practices they should consider

Keep the response practical and actionable.
`;

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: "You are a CRM analytics expert providing data-driven insights and recommendations."
        },
        {
          role: "user",
          content: insightPrompt
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 600,
        temperature: 0.3
      });

      const insights = response.choices?.[0]?.message?.content || 
        'Unable to generate insights at this time.';

      console.log('✅ CRM insights generated successfully');
      return insights.trim();

    } catch (error) {
      console.error('🔴 CRM insights generation failed:', error);
      return 'Sorry, I couldn\'t generate CRM insights at this time. Please try again later.';
    }
  }

  /**
   * Suggests next actions based on CRM data
   */
  static async suggestNextActions(userId: string): Promise<string> {
    try {
      console.log('🎯 Generating action suggestions for user:', userId);

      const analytics = await buildAnalyticsContext(userId);
      const crmContext = await buildCRMContext(userId, "What should I do next with my CRM?");

      const actionPrompt = `
Based on the CRM data, suggest 5-7 specific next actions the user should take:

CONTEXT:
• Recent activity level: ${analytics.recentActivityCount} activities in last 7 days
• Total contacts: ${analytics.totalContacts}
• Organization level: ${analytics.totalTags} tags created

Focus on:
1. Contacts that need follow-up
2. Data organization improvements  
3. Relationship building opportunities
4. Process optimization suggestions
5. Growth opportunities

Provide specific, actionable recommendations with clear next steps.
`;

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: crmContext
        },
        {
          role: "user",
          content: actionPrompt
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 400,
        temperature: 0.5
      });

      const suggestions = response.choices?.[0]?.message?.content || 
        'Unable to generate action suggestions at this time.';

      console.log('✅ Action suggestions generated successfully');
      return suggestions.trim();

    } catch (error) {
      console.error('🔴 Action suggestions generation failed:', error);
      return 'Sorry, I couldn\'t generate action suggestions at this time. Please try again later.';
    }
  }

  /**
   * Analyzes contact relationships and suggests engagement strategies
   */
  static async analyzeContactEngagement(userId: string, contactName?: string): Promise<string> {
    try {
      console.log('👥 Analyzing contact engagement for user:', userId);

      const crmContext = await buildCRMContext(
        userId, 
        contactName 
          ? `Analyze my relationship and suggest engagement strategies for ${contactName}`
          : "Analyze my contact engagement patterns and suggest improvements"
      );

      const engagementPrompt = contactName
        ? `Analyze the relationship with ${contactName} and suggest specific engagement strategies.`
        : "Analyze overall contact engagement patterns and suggest improvement strategies.";

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: crmContext
        },
        {
          role: "user",
          content: engagementPrompt
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 400,
        temperature: 0.6
      });

      const analysis = response.choices?.[0]?.message?.content || 
        'Unable to analyze contact engagement at this time.';

      console.log('✅ Contact engagement analysis completed');
      return analysis.trim();

    } catch (error) {
      console.error('🔴 Contact engagement analysis failed:', error);
      return 'Sorry, I couldn\'t analyze contact engagement at this time. Please try again later.';
    }
  }

  /**
   * Fallback response when AI processing fails
   */
  private static async getFallbackResponse(userMessage: string): Promise<string> {
    const fallbackResponses = [
      "I'm here to help with your CRM needs. Could you please rephrase your question?",
      "I'm having trouble processing that request right now. How else can I assist you with your CRM?",
      "Let me help you with your customer relationship management. What specific task would you like help with?",
      "I'm your CRM assistant. I can help with contacts, activities, insights, and more. What would you like to know?",
      "I'm here to make your CRM experience better. What can I help you accomplish today?"
    ];

    // Simple keyword-based fallback
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('contact')) {
      return "I can help you manage contacts. You can ask me about adding new contacts, organizing existing ones, or analyzing your contact relationships.";
    }
    
    if (lowerMessage.includes('activity') || lowerMessage.includes('task')) {
      return "I can assist with activity tracking and task management. Would you like help logging activities or analyzing your recent interactions?";
    }
    
    if (lowerMessage.includes('insight') || lowerMessage.includes('analysis')) {
      return "I can provide insights about your CRM data. Would you like me to analyze your contact patterns, activity trends, or suggest next actions?";
    }

    // Random fallback response
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

export default EnhancedAIService;
