import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string | string[]; // Роль или массив ролей, допущенных к маршруту
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
}) => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    let userRole = null;

    if (userString) {
        try {
            const user = JSON.parse(userString);
            userRole = user.role; // Предполагаем, что в user есть поле role
        } catch (e) {
            console.error("Error parsing user data from localStorage", e);
        }
    }

    if (!token || !userRole) {
        // Если нет токена или роли, редиректим на логин
        return <Navigate to="/login" replace />;
    }

    if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole)
            ? requiredRole
            : [requiredRole];
        if (!allowedRoles.includes(userRole)) {
            // Если у пользователя нет необходимой роли, можно редиректить на главную или показать ошибку
            // Пока редиректим на главную
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
