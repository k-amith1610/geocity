/*
import { NextRequest, NextResponse } from 'next/server';

interface RouteData {
  origin: string;
  destination: string;
  mode: 'driving' | 'walking' | 'bicycling';
}

interface RouteHistory {
  id: string;
  origin: string;
  destination: string;
  mode: string;
  timestamp: string;
  distance?: string;
  duration?: string;
}

// In-memory storage for demo purposes
// In production, use a proper database
let routeHistory: RouteHistory[] = [];

export async function POST(request: NextRequest) {
  try {
    const body: RouteData = await request.json();
    
    // Validate required fields
    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { status: 'error', message: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    // Validate travel mode
    const validModes = ['driving', 'walking', 'bicycling'];
    if (!validModes.includes(body.mode)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid travel mode' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Call Google Maps Directions API
    // 2. Process the response
    // 3. Store the route in database
    // 4. Return the route data

    // Simulate route calculation
    const routeId = `ROUTE-${Date.now()}`;
    const routeEntry: RouteHistory = {
      id: routeId,
      origin: body.origin,
      destination: body.destination,
      mode: body.mode,
      timestamp: new Date().toISOString(),
      distance: '5.2 km', // Simulated
      duration: '12 min'  // Simulated
    };

    // Store route history
    routeHistory.push(routeEntry);

    // Log for debugging
    console.log('Route calculated:', {
      origin: body.origin,
      destination: body.destination,
      mode: body.mode,
      routeId
    });

    return NextResponse.json({
      status: 'success',
      message: 'Route calculated successfully',
      data: {
        routeId,
        origin: body.origin,
        destination: body.destination,
        mode: body.mode,
        distance: routeEntry.distance,
        duration: routeEntry.duration,
        timestamp: routeEntry.timestamp
      }
    });

  } catch (error) {
    console.error('Error calculating route:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return route history (in production, implement pagination and filtering)
    return NextResponse.json({
      status: 'success',
      data: {
        routes: routeHistory.slice(-10) // Last 10 routes
      }
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
*/ 