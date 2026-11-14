// src/pages/dashboard/DashboardPage.tsx
export default function DashboardPage() {
    return (
        <div>
            <h1>Dashboard Principal</h1>
            <p>Resumen general del negocio.</p>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <div style={{ padding: "1.5rem", border: "1px solid #e5e4e7", borderRadius: "8px", flex: 1 }}>
                    <h3>Saldo Disponible</h3>
                    <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>$ 0.00</p>
                </div>

                <div style={{ padding: "1.5rem", border: "1px solid #e5e4e7", borderRadius: "8px", flex: 1 }}>
                    <h3>Obras Activas</h3>
                    <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>0</p>
                </div>

                <div style={{ padding: "1.5rem", border: "1px solid #e5e4e7", borderRadius: "8px", flex: 1 }}>
                    <h3>Tareas Pendientes</h3>
                    <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>0</p>
                </div>
            </div>
        </div>
    );
}