// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    type User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from '../services/firebase/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const translateFirebaseError = (code: string): string => {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Correo electrónico o contraseña incorrectos.';
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está registrado.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/popup-closed-by-user':
            return 'Se cerró la ventana de inicio de sesión con Google.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos fallidos. Intenta más tarde.';
        default:
            return 'Ocurrió un error en la autenticación. Verifica tus datos.';
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const clearError = () => setError(null);

    const loginWithEmail = async (email: string, pass: string) => {
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (err) {
            if (err instanceof FirebaseError) {
                setError(translateFirebaseError(err.code));
            } else {
                setError('Error inesperado al iniciar sesión.');
            }
            throw err;
        }
    };

    const registerWithEmail = async (email: string, pass: string, name: string) => {
        setError(null);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            if (name.trim()) {
                await updateProfile(cred.user, { displayName: name.trim() });
            }
        } catch (err) {
            if (err instanceof FirebaseError) {
                setError(translateFirebaseError(err.code));
            } else {
                setError('Error inesperado al registrar usuario.');
            }
            throw err;
        }
    };

    const loginWithGoogle = async () => {
        setError(null);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            if (err instanceof FirebaseError) {
                setError(translateFirebaseError(err.code));
            } else {
                setError('Error al iniciar sesión con Google.');
            }
            throw err;
        }
    };

    const logout = async () => {
        setError(null);
        await signOut(auth);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                loginWithEmail,
                registerWithEmail,
                loginWithGoogle,
                logout,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};