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