import React from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const SalonDashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Личный кабинет Салона
                </Typography>
                <Typography variant="body1" gutterBottom>
                    Здесь будут отображаться управление мастерами, общий журнал,
                    аналитика и настройки салона.
                </Typography>
                <Box sx={{ mt: 2 }}>
                    {/* Пока кнопки-заглушки */}
                    <Button variant="outlined" sx={{ mr: 1 }}>
                        Профиль
                    </Button>
                    <Button variant="outlined" sx={{ mr: 1 }}>
                        Мастера
                    </Button>
                    <Button variant="outlined" sx={{ mr: 1 }}>
                        Записи
                    </Button>
                    <Button variant="outlined" onClick={handleLogout}>
                        Выйти
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default SalonDashboard;
