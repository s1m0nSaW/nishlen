import React from "react";
import { Container, Typography, Box, Button, Tab, Tabs } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ProfileForm from "./ProfileForm";

const MasterDashboard: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const activeTab = location.pathname === "/dashboard/master/profile" ? 1 : 0;

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        if (newValue === 0) {
            navigate("/dashboard/master");
        } else if (newValue === 1) {
            navigate("/dashboard/master/profile");
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Личный кабинет Мастера
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        aria-label="master dashboard tabs"
                    >
                        <Tab label="Обзор" />
                        <Tab label="Профиль" />
                        {/* TODO: Добавить вкладку Топ, если нужно мастеру */}
                    </Tabs>
                </Box>
                {activeTab === 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body1" gutterBottom>
                            Здесь будут отображаться ваш журнал записей,
                            клиентская база, портфолио и настройки.
                        </Typography>
                        {/* Пока кнопки-заглушки */}
                        <Button
                            variant="outlined"
                            sx={{ mr: 1 }}
                            onClick={() =>
                                navigate("/dashboard/master/profile")
                            }
                        >
                            Редактировать профиль
                        </Button>
                        <Button variant="outlined" sx={{ mr: 1 }}>
                            Записи
                        </Button>
                        <Button variant="outlined" sx={{ mr: 1 }}>
                            Портфолио
                        </Button>
                        <Button variant="outlined" onClick={handleLogout}>
                            Выйти
                        </Button>
                    </Box>
                )}
                {activeTab === 1 && <ProfileForm />}
            </Box>
        </Container>
    );
};

export default MasterDashboard;
