import { useState, useEffect } from 'react';
import { collection, query, orderBy, where, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Trade {
  id: string;
  userId: string;
  accountId?: string;
  date: string;
  symbol: string;
  action: string;
  size: string;
  result: string;
  isPositive: boolean;
  pnl: number;
  createdAt: any;
  entry?: string;
  exit?: string;
  duration?: string;
  tag?: string;
  // Journaling fields
  strategy?: string;
  notes?: string;
  emotions?: string[];
  tags?: string[];
  proof?: string | null;
  rating?: number;
  checklist?: { label: string; checked: boolean }[];
  tradeType?: string;
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

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradesData: Trade[] = [];
      snapshot.forEach((doc) => {
        tradesData.push({ id: doc.id, ...doc.data() } as Trade);
      });
      
      // Sort on client side to avoid needing a composite index in Firestore
      tradesData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setTrades(tradesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trades', { currentUser: user });
    });

    return () => unsubscribe();
  }, [user]);

  const addTrade = async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'trades'), {
        ...tradeData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trades', { currentUser: user });
    }
  };

  const deleteTrades = async (tradeIds: string[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      tradeIds.forEach(id => {
        batch.delete(doc(db, 'trades', id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'trades', { currentUser: user });
    }
  };

  const updateTrades = async (tradeIds: string[], data: Partial<Trade>) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      tradeIds.forEach(id => {
        batch.update(doc(db, 'trades', id), data);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trades', { currentUser: user });
    }
  };

  return { trades, loading, addTrade, deleteTrades, updateTrades };
}
