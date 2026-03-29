import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Account {
  id: string;
  userId: string;
  name: string;
  firm: string;
  type: string;
  badge: string;
  initialCapital: number;
  status: 'ACTIVE' | 'SUCCESS' | 'FAILED';
  maxDrawdown: number;
  dailyDrawdown: number;
  createdAt: any;
  dateClosed?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'accounts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsData: Account[] = [];
      snapshot.forEach((doc) => {
        accountsData.push({ id: doc.id, ...doc.data() } as Account);
      });
      
      accountsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setAccounts(accountsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts', { currentUser: user });
    });

    return () => unsubscribe();
  }, [user]);

  const addAccount = async (accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'accounts'), {
        ...accountData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts', { currentUser: user });
    }
  };

  const updateAccount = async (accountId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    
    try {
      const accountRef = doc(db, 'accounts', accountId);
      await updateDoc(accountRef, accountData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${accountId}`, { currentUser: user });
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    
    try {
      const accountRef = doc(db, 'accounts', accountId);
      await deleteDoc(accountRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${accountId}`, { currentUser: user });
    }
  };

  return { accounts, loading, addAccount, updateAccount, deleteAccount };
}
