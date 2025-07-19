import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/fireBaseConfig';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

// User interface based on the Firestore structure (without password for API)
interface User {
  id?: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: number;
  pointsEarned: number;
  raisedIssues: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// GET - Fetch all users or a specific user by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limitCount = parseInt(searchParams.get('limit') || '10');
    const email = searchParams.get('email');

    const usersRef = collection(db, 'user');

    if (id) {
      // Get specific user by ID (Firebase UID)
      const userDoc = await getDoc(doc(db, 'user', id));
      
      if (!userDoc.exists()) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const userData = { id: userDoc.id, ...userDoc.data() };
      return NextResponse.json(userData);
    }

    if (email) {
      // Get user by email
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const userData = { 
        id: querySnapshot.docs[0].id, 
        ...querySnapshot.docs[0].data() 
      };
      return NextResponse.json(userData);
    }

    // Get all users with pagination
    let q = query(usersRef, orderBy('createdAt', 'desc'), limit(limitCount));
    
    if (page > 1) {
      // For pagination, you would need to implement cursor-based pagination
      // This is a simplified version
      const offset = (page - 1) * limitCount;
      // Note: Firestore doesn't support offset, so this is simplified
    }

    const querySnapshot = await getDocs(q);
    const users: User[] = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as User);
    });

    return NextResponse.json({
      users,
      total: users.length,
      page,
      limit: limitCount
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create a new user (this should be used with authentication)
export async function POST(request: NextRequest) {
  try {
    const body: User = await request.json();

    // Validation
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if user with same email already exists
    const usersRef = collection(db, 'user');
    const q = query(usersRef, where('email', '==', body.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Prepare user data
    const userData: Omit<User, 'id'> = {
      name: body.name,
      email: body.email,
      address: body.address || '',
      phoneNumber: body.phoneNumber || 0,
      pointsEarned: body.pointsEarned || 0,
      raisedIssues: body.raisedIssues || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add user to Firestore
    const docRef = await addDoc(collection(db, 'user'), userData);
    
    const newUser = {
      id: docRef.id,
      ...userData
    };

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing user
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body: Partial<User> = await request.json();

    // Check if user exists
    const userDoc = await getDoc(doc(db, 'user', id));
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being updated, check for duplicates
    if (body.email && body.email !== userDoc.data().email) {
      const usersRef = collection(db, 'user');
      const q = query(usersRef, where('email', '==', body.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: Partial<User> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove id from update data if present
    delete updateData.id;

    // Update user in Firestore
    await updateDoc(doc(db, 'user', id), updateData);

    // Get updated user data
    const updatedDoc = await getDoc(doc(db, 'user', id));
    const updatedUser = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, 'user', id));
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user from Firestore
    await deleteDoc(doc(db, 'user', id));

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update of user (alternative to PUT)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body: Partial<User> = await request.json();

    // Check if user exists
    const userDoc = await getDoc(doc(db, 'user', id));
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being updated, check for duplicates
    if (body.email && body.email !== userDoc.data().email) {
      const usersRef = collection(db, 'user');
      const q = query(usersRef, where('email', '==', body.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: Partial<User> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove id from update data if present
    delete updateData.id;

    // Update user in Firestore
    await updateDoc(doc(db, 'user', id), updateData);

    // Get updated user data
    const updatedDoc = await getDoc(doc(db, 'user', id));
    const updatedUser = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
