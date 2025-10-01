import React, { useState } from "react";
import { Button, TextField, Container, Typography, Box } from "@mui/material";
import api from "../utils/auth";

const Login: React.FC = () => {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api
                .post("/auth/login", { username: phone, password })
                .then((res) => {
                    localStorage.setItem("token", res.data.token);
                    console.log("User:", res.data.user);
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    window.location.href = "/dashboard";
                });
        } catch (err) {
            console.error("Login failed");
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    mt: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Typography variant="h4">Вход в Nishlen</Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ mt: 1, width: "100%" }}
                >
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Телефон"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3 }}
                    >
                        Войти
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default Login;
