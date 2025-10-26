import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import BookingSearch from "./components/BookingSearch";
import BookingForm from "./components/BookingForm";
import ClientDashboard from "./components/ClientDashboard";
import MasterDashboard from "./components/MasterDashboard";
import SalonDashboard from "./components/SalonDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfileForm from "./components/ProfileForm"; // Импортируем ProfileForm
import TopList from "./components/TopList"; // Добавляем импорт

const theme = createTheme({
    palette: { primary: { main: "#FF6B6B" } }, // Розовый для beauty
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route
                        path="/"
                        element={<div>Welcome to Nishlen.ru! ✨</div>}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    {/* Защищенные маршруты для дашбордов */}
                    <Route
                        path="/dashboard/client"
                        element={
                            <ProtectedRoute requiredRole="client">
                                <ClientDashboard />
                            </ProtectedRoute>
                        }
                    />
                    {/* Добавляем маршрут для формы профиля клиента */}
                    <Route
                        path="/dashboard/client/profile"
                        element={
                            <ProtectedRoute requiredRole="client">
                                <ProfileForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/master"
                        element={
                            <ProtectedRoute requiredRole="master">
                                <MasterDashboard />
                            </ProtectedRoute>
                        }
                    />
                    {/* Добавляем маршрут для формы профиля мастера */}
                    <Route
                        path="/dashboard/master/profile"
                        element={
                            <ProtectedRoute requiredRole="master">
                                <ProfileForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/salon"
                        element={
                            <ProtectedRoute requiredRole="salon_admin">
                                <SalonDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/client/top"
                        element={
                            <ProtectedRoute requiredRole="client">
                                <TopList />
                            </ProtectedRoute>
                        }
                    />
                    {/* Добавляем маршрут для формы профиля салона */}
                    <Route
                        path="/dashboard/salon/profile"
                        element={
                            <ProtectedRoute requiredRole="salon_admin">
                                <ProfileForm />
                            </ProtectedRoute>
                        }
                    />
                    {/* Маршрут /dashboard теперь редиректит на конкретный дашборд, но только если пользователь залогинен */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                {(() => {
                                    const userString =
                                        localStorage.getItem("user");
                                    let userRole = null;
                                    if (userString) {
                                        try {
                                            const user = JSON.parse(userString);
                                            userRole = user.role;
                                        } catch (e) {
                                            console.error(
                                                "Error parsing user data",
                                                e
                                            );
                                            return (
                                                <Navigate to="/login" replace />
                                            );
                                        }
                                    } else {
                                        return <Navigate to="/login" replace />;
                                    }

                                    if (userRole === "client") {
                                        return (
                                            <Navigate
                                                to="/dashboard/client"
                                                replace
                                            />
                                        );
                                    } else if (userRole === "master") {
                                        return (
                                            <Navigate
                                                to="/dashboard/master"
                                                replace
                                            />
                                        );
                                    } else if (userRole === "salon_admin") {
                                        return (
                                            <Navigate
                                                to="/dashboard/salon"
                                                replace
                                            />
                                        );
                                    } else {
                                        console.error(
                                            "Unexpected user role:",
                                            userRole
                                        );
                                        return <Navigate to="/login" replace />;
                                    }
                                })()}
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/search" element={<BookingSearch />} />
                    <Route path="/book/:masterId" element={<BookingForm />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
