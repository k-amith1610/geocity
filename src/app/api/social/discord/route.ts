import { NextRequest, NextResponse } from 'next/server';

// Discord Webhook Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

interface DiscordMessageData {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    timestamp?: string;
    footer?: {
      text: string;
    };
    image?: {
      url: string;
    };
  }>;
}

// Function to send message to Discord
async function sendDiscordMessage(messageData: DiscordMessageData): Promise<boolean> {
  try {
    if (!DISCORD_WEBHOOK_URL) {
      console.error('❌ Discord webhook URL not configured');
      return false;
    }

    console.log('📱 Sending Discord notification...');
    console.log('📝 Message data:', JSON.stringify(messageData, null, 2));

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (response.ok) {
      console.log('✅ Discord notification sent successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Discord notification failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending Discord notification:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: message',
      }, { status: 400 });
    }

    // Create Discord embed for notification
    const discordMessage: DiscordMessageData = {
      embeds: [
        {
          title: body.isEmergency ? '🚨 EMERGENCY ALERT' : '📋 ISSUE REPORT',
          description: body.message,
          color: body.isEmergency ? 0xFF0000 : 0x00FF00, // Red for emergency, Green for regular
          timestamp: new Date().toISOString(),
          footer: {
            text: 'GeoCity Emergency Monitoring System'
          },
          ...(body.imageUrl && {
            image: {
              url: body.imageUrl
            }
          })
        }
      ]
    };

    const success = await sendDiscordMessage(discordMessage);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Discord notification sent successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send Discord notification',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Discord API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Discord API error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Discord API endpoint is operational',
    requiredEnvVars: [
      'DISCORD_WEBHOOK_URL'
    ],
    setupInstructions: [
      '1. Create a Discord server',
      '2. Create a webhook in a channel',
      '3. Copy the webhook URL',
      '4. Add DISCORD_WEBHOOK_URL to your .env file'
    ],
    timestamp: new Date().toISOString(),
  });
} 