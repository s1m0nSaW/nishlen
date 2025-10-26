import React from "react";
import { Container, Typography, Box, Button, Tab, Tabs } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ProfileForm from "./ProfileForm";
import TopList from "./TopList"; // Импортируем TopList

const ClientDashboard: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    // Определяем активную вкладку на основе пути
    const path = location.pathname;
    let activeTab = 0;
    if (path === "/dashboard/client/profile") activeTab = 1;
    else if (path === "/dashboard/client/top") activeTab = 2;

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        if (newValue === 0) {
            navigate("/dashboard/client");
        } else if (newValue === 1) {
            navigate("/dashboard/client/profile");
        } else if (newValue === 2) {
            navigate("/dashboard/client/top");
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Личный кабинет Клиента
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        aria-label="client dashboard tabs"
                    >
                        <Tab label="Обзор" />
                        <Tab label="Профиль" />
                        <Tab label="Топ мастеров" /> {/* Новая вкладка */}
                    </Tabs>
                </Box>
                {activeTab === 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body1" gutterBottom>
                            Здесь будут отображаться ваши записи, история
                            посещений, пожелания и рейтинги.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => navigate("/search")}
                        >
                            Найти мастера
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ ml: 1 }}
                            onClick={handleLogout}
                        >
                            Выйти
                        </Button>
                    </Box>
                )}
                {activeTab === 1 && <ProfileForm />}
                {activeTab === 2 && <TopList />}{" "}
                {/* Рендерим TopList на вкладке Топ */}
            </Box>
        </Container>
    );
};

export default ClientDashboard;
