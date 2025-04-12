import { User, UserType } from '../types/user';
import { auth } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

export interface AuthCredentials {
  email: string;
  password: string;
  fullName?: string;
  userType: UserType;
}

// Convert Firebase user to our User type
const createUserFromFirebaseUser = (firebaseUser: any, userType: UserType): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    fullName: firebaseUser.displayName || '',
    userType: userType,
    certificates: []
  };
};

export const loginUser = async (credentials: AuthCredentials): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // Store user type in localStorage
    localStorage.setItem('userType', credentials.userType);
    
    return createUserFromFirebaseUser(userCredential.user, credentials.userType);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const loginWithGoogle = async (userType: UserType): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Store user type in localStorage
    localStorage.setItem('userType', userType);
    
    return createUserFromFirebaseUser(result.user, userType);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const registerUser = async (credentials: AuthCredentials): Promise<void> => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    // Registration successful - user can now login
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    localStorage.removeItem('userType');
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = (): User | null => {
  const firebaseUser = auth.currentUser;
  const userType = localStorage.getItem('userType') as UserType;
  
  if (firebaseUser && userType) {
    return createUserFromFirebaseUser(firebaseUser, userType);
  }
  
  return null;
};

// Update user
export const updateUser = (updatedUser: User): Promise<User> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user is currently logged in');
  }

  // Update the user type in localStorage
  localStorage.setItem('userType', updatedUser.userType);
  
  return Promise.resolve(updatedUser);
};
