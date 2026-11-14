// src/components/layout/MainLayout.tsx
import { Outlet, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function MainLayout() {
    const { user } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión", error);
        }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <aside style={{ width: "250px", background: "#f4f4f4", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                <h2>MYD Control</h2>
                <p style={{ fontSize: "0.8rem", color: "gray", marginBottom: "2rem" }}>
                    {user?.email}
                </p>

                <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <Link to="/" style={{ textDecoration: "none", color: "#333" }}>Dashboard</Link>
                    <Link to="/obras" style={{ textDecoration: "none", color: "#333" }}>Obras</Link>
                    <Link to="/tareas" style={{ textDecoration: "none", color: "#333" }}>Tareas</Link>
                    <Link to="/empleados" style={{ textDecoration: "none", color: "#333" }}>Empleados</Link>
                </nav>

                <button
                    onClick={handleLogout}
                    style={{ marginTop: "auto", padding: "0.5rem", cursor: "pointer" }}
                >
                    Cerrar Sesión
                </button>
            </aside>

            <main style={{ flex: 1, padding: "2rem" }}>
                <Outlet />
            </main>
        </div>
    );
}