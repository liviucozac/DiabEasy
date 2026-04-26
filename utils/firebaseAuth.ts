import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Get this from Firebase Console → Authentication → Sign-in providers →
// Google → Web SDK configuration → Web client ID
const WEB_CLIENT_ID = '150645699717-s1emc44hle6kkkqopjqsrs7cef7chkjl.apps.googleusercontent.com';

GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

export const signUp = async (email: string, password: string) => {
  const result = await auth().createUserWithEmailAndPassword(email, password);
  return result.user;
};

export const signIn = async (email: string, password: string) => {
  const result = await auth().signInWithEmailAndPassword(email, password);
  return result.user;
};

export const signOut = async () => {
  await auth().signOut();
  if (GoogleSignin.getCurrentUser()) await GoogleSignin.signOut();
};

export const getCurrentUser = () => {
  return auth().currentUser;
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};

export const sendPasswordReset = async (email: string) => {
  await auth().sendPasswordResetEmail(email);
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const user = auth().currentUser;
  if (!user || !user.email) throw new Error('Not signed in.');
  const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
  await user.reauthenticateWithCredential(credential);
  await user.updatePassword(newPassword);
};

export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('No ID token received from Google.');
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  return result.user;
};
