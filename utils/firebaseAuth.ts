import auth from '@react-native-firebase/auth';

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